export type Point = {x:number;y:number};
type Vec = [number,number,number];
const dot=(a:Vec,b:Vec)=>a.reduce((v,n,i)=>v+n*b[i],0);
const sub=(a:Vec,b:Vec):Vec=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const norm=(a:Vec):Vec=>a.map(n=>n/Math.hypot(...a)) as Vec;
const cross=(a:Vec,b:Vec):Vec=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Millimetres. Camera is above the bass edge, looking left towards the nut.
const eye:Vec=[470,230,260], forward=norm(sub([160,0,0],eye));
const right=norm(cross(forward,[0,0,-1])), up=cross(right,forward);
const H=460; // alto del lienzo de referencia (1100 × 460)
export const fret=(n:number)=>650*(1-Math.pow(2,-n/12));
export const width=(x:number)=>52+10*x/325;
export const stringY=(s:number,x:number)=>(s-2.5)*(43+14*x/650)/5;
export const positionX=(f:number)=> f===0 ? -10 : fret(f-1)+(fret(f)-fret(f-1))*.64;
export function project(x:number,y:number,z=0):Point {
  const v=sub([x,y,z],eye), depth=dot(v,forward);
  // Camera roll follows the neck across the player's lap. Uniform scale preserves perspective.
  const u=1500*dot(v,right)/depth, w=-1500*dot(v,up)/depth, roll=48*Math.PI/180;
  // Volteo vertical (Luis, 2026-10-20): así ve el mástil el guitarrista sentado, con la 1ª arriba,
  // la 6ª abajo y el mástil subiendo hacia la caja. Los textos se dibujan derechos aparte.
  return {x:480+.75*(u*Math.cos(roll)-w*Math.sin(roll)),y:H-(200+.75*(u*Math.sin(roll)+w*Math.cos(roll)))};
}
export const position=(s:number,f:number)=>project(positionX(f),stringY(s,positionX(f)),3);
export function inside(p:Point,poly:Point[]) {
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) hit=!hit;
  }
  return hit;
}
export function hitPosition(p:Point):[number,number]|null {
  for(let f=0;f<=12;f++) for(let s=0;s<6;s++) {
    const x0=f===0?-22:fret(f-1),x1=f===0?0:fret(f);
    const edge=(x:number,n:number)=>stringY(s,x)+n*(43+14*x/650)/10;
    if(inside(p,[project(x0,edge(x0,-1),3),project(x1,edge(x1,-1),3),project(x1,edge(x1,1),3),project(x0,edge(x0,1),3)])) return [s,f];
  }
  return null;
}
// Visual diameters in reference-canvas units; nylon increases E -> B -> G.
export const STRING_DIAMETERS=[1.5,2.1,2.8,3.7,4.5,5.3] as const;
export function stringLabels(viewportWidth:number){
  const spacing=Math.max(24,20*1100/viewportWidth);
  return Array.from({length:6},(_,s)=>({s,label:{x:115,y:H-170-(2.5-s)*spacing},anchor:project(-22,stringY(s,-22),3)}));
}
export function draw(canvas:HTMLCanvasElement,active:[number,number]|null,preview:[number,number]|null=null) {
  const c=canvas.getContext('2d')!;
  const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;
  canvas.width=w*dpr;canvas.height=h*dpr;c.scale(w*dpr/1100,h*dpr/460);
  const line=(a:Point,b:Point,color:string,size=1)=>{c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=color;c.lineWidth=size;c.stroke();};
  const polygon=(points:Point[],fill:string|CanvasGradient)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();};
  const board=(z:number)=>[project(0,-26,z),project(345,-width(345)/2,z),project(345,width(345)/2,z),project(0,26,z)];
  const bg=c.createRadialGradient(800,H-180,20,550,H-230,700);bg.addColorStop(0,'#44352b');bg.addColorStop(.55,'#201b18');bg.addColorStop(1,'#100e0d');c.fillStyle=bg;c.fillRect(0,0,1100,460);
  // A restrained glimpse of the cedar body situates the neck against the player.
  const body=c.createLinearGradient(800,H,1100,H-400);body.addColorStop(0,'#b57e43');body.addColorStop(.5,'#80522d');body.addColorStop(1,'#d7a366');
  const bodyPts:Point[]=[];for(let i=0;i<70;i++){const a=i/69*Math.PI*2;bodyPts.push(project(490+150*Math.cos(a),140*Math.sin(a),-13));}polygon(bodyPts,body);
  for(let i=0;i<45;i++){const y=-135+i*6;line(project(360,y,-12),project(600,y,-12),'#2d190b18',1);}
  // Slotted headstock, bone nut, and mahogany neck edge.
  polygon([project(-90,-31,-4),project(0,-26,-4),project(0,26,-4),project(-90,31,-4)],'#68422b');
  for(const y of [-17,17])polygon([project(-78,y-5,-3),project(-18,y-5,-3),project(-18,y+5,-3),project(-78,y+5,-3)],'#171311');
  for(const x of [-68,-47,-27]) for(const y of [-17,17]) line(project(x,y-5,-2),project(x,y+5,-2),'#cfbb94',3);
  c.save();c.shadowColor='#000b';c.shadowBlur=22;c.shadowOffsetY=20;polygon(board(-8),'#18100c');c.restore();
  polygon([project(0,26,0),project(345,width(345)/2,0),project(345,width(345)/2,-12),project(0,26,-12)],'#61412e');
  line(project(0,26,-6),project(345,width(345)/2,-6),'#956749',1);
  const wood=c.createLinearGradient(350,H-90,850,H-350);wood.addColorStop(0,'#211a17');wood.addColorStop(.45,'#49352a');wood.addColorStop(.65,'#2b201b');wood.addColorStop(1,'#171312');polygon(board(0),wood);
  c.save();c.beginPath();board(0).forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();
  // Deterministic longitudinal grain, drawn in world coordinates before projection.
  for(let i=0;i<190;i++){const y=-35+i*.38;c.beginPath();for(let x=0;x<=350;x+=5){const p=project(x,y+Math.sin(x*.027+i*1.7)*.18+Math.sin(x*.008+i)*.5,0);x?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.strokeStyle=i%3?'#d7985820':'#05040366';c.lineWidth=i%5===0?1.2:.5;c.stroke();}c.restore();
  line(project(0,26,.1),project(345,width(345)/2,.1),'#c3976870',1.4);
  for(const f of [3,5,7,9,12]){
    const x=positionX(f);for(const y of f===12?[-9,9]:[0]){const p=project(x,y,.1);c.beginPath();c.ellipse(p.x,p.y,3.2,2.2,.35,0,Math.PI*2);c.fillStyle='#c8bd9c8a';c.fill();}
    const p=project(x,width(x)/2,-4);c.beginPath();c.arc(p.x,p.y,1.8,0,Math.PI*2);c.fillStyle='#e6d4ab';c.fill();
  }
  for(let f=0;f<=12;f++){
    const x=fret(f),a=project(x,-width(x)/2,.6),b=project(x,width(x)/2,.6);
    line({x:a.x+1,y:a.y-2},{x:b.x+1,y:b.y-2},'#0009',f?4:7);
    const metal=c.createLinearGradient(a.x,a.y,b.x,b.y);metal.addColorStop(0,'#8b8171');metal.addColorStop(.2,'#fff5d9');metal.addColorStop(.45,'#a49d93');metal.addColorStop(.7,'#eae6da');metal.addColorStop(1,'#6b6862');
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle=f?metal:'#e6d7b6';c.lineWidth=f?2.5:6;c.stroke();
    const p=project(f===0?-10:positionX(f),-width(x)/2-11);c.fillStyle='#e0d0b6';c.font='12px Arial';c.textAlign='center';c.fillText(String(f),p.x,p.y);
  }
  // Draw far strings first. Width and winding remain distinct after responsive scaling.
  for(let s=0;s<6;s++){
    const a=project(-22,stringY(s,-22),3),b=project(350,stringY(s,350),3);
    const len=Math.hypot(b.x-a.x,b.y-a.y),tx=(b.x-a.x)/len,ty=(b.y-a.y)/len;
    const nx=-ty,ny=tx,thickness=STRING_DIAMETERS[s];
    const offset=(p:Point,n:number):Point=>({x:p.x+nx*n,y:p.y+ny*n});
    // Shadow lands on the wood plane rather than being another painted string.
    c.save();c.shadowColor='#0009';c.shadowBlur=2;
    line(project(-22,stringY(s,-22)+1,0),project(350,stringY(s,350)+1,0),'#0008',thickness*.9);
    c.restore();
    for(let i=0;i<24;i++){
      const t=i/24,t1=(i+1)/24;
      const start={x:a.x+tx*len*t,y:a.y+ty*len*t},end={x:a.x+tx*len*t1,y:a.y+ty*len*t1};
      const diameter=thickness*(.72+.4*t);
      if(s>=3){
        line(start,end,'#4c4b47',diameter);
        line(offset(start,-diameter*.12),offset(end,-diameter*.12),'#b7b4a6',diameter*.72);
        line(offset(start,-diameter*.28),offset(end,-diameter*.28),'#fff0cf',diameter*.20);
      }else{
        line(start,end,'#d5e3df48',diameter);
        line(offset(start,diameter*.28),offset(end,diameter*.28),'#b6b9ac70',diameter*.22);
        line(offset(start,-diameter*.28),offset(end,-diameter*.28),'#fff9e5b0',Math.max(.4,diameter*.20));
      }
    }
    if(s>=3){
      for(let distance=0;distance<len;distance+=2.6){
        const t=distance/len,r=thickness*(.72+.4*t)*.48;
        const p={x:a.x+tx*distance,y:a.y+ty*distance};
        line({x:p.x-nx*r-tx*.55,y:p.y-ny*r-ty*.55},{x:p.x+nx*r+tx*.55,y:p.y+ny*r+ty*.55},'#292b2aab',.8);
        line({x:p.x-nx*r+tx*.35,y:p.y-ny*r+ty*.35},{x:p.x+tx*.8,y:p.y+ty*.8},'#fff6dc99',.55);
      }
    }
  }
  // A separate label rail with leaders avoids the crowded slotted headstock.
  for(const {s,label,anchor} of stringLabels(w)){
    line({x:label.x+12,y:label.y-4},{x:anchor.x-12,y:anchor.y},'#decba573',.8);
    line({x:anchor.x-12,y:anchor.y},anchor,'#decba5aa',1);
    c.fillStyle='#f1e6d0';c.font=`${14*1100/w}px Arial`;c.textAlign='right';
    c.fillText(['1 · E','2 · B','3 · G','4 · D','5 · A','6 · E'][s],label.x,label.y);
  }
  for(const [pos,color] of [[preview,'#f1e3c6'],[active,'#f3c94f']] as const){if(!pos)continue;const p=position(...pos);c.beginPath();c.arc(p.x,p.y,9,0,Math.PI*2);c.fillStyle='#17110f';c.fill();c.strokeStyle=color;c.lineWidth=2;c.stroke();c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fillStyle=color;c.fill();}
}
