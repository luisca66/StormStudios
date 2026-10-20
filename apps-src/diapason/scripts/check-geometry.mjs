import assert from 'node:assert/strict';
import {position,hitPosition,project,fret,width,stringLabels,STRING_DIAMETERS} from '../src/geometry.ts';
assert.equal(fret(12),325);
for(let s=0;s<6;s++)for(let f=0;f<=12;f++){
 const p=position(s,f);
 assert.deepEqual(hitPosition(p),[s,f],`String ${s+1}, fret ${f}`);
 assert.ok(p.x>0&&p.x<1100&&p.y>0&&p.y<460,'Position stays inside canvas');
 // Sample both sides of the target: interaction must cover an area, not only a dot.
 for(const dy of [-1,1]) assert.deepEqual(hitPosition({x:p.x,y:p.y+dy}),[s,f]);
}
assert.equal(hitPosition({x:0,y:0}),null);
const span=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
assert.ok(span(project(fret(12),0),project(fret(11),0))>span(project(fret(1),0),project(0,0)),'Perspective increases apparent spacing towards body');
console.log('PASS: 78 positions, 156 neighbouring hits, bounds, open strings, 650 mm scale and perspective.');

for(let f=0;f<=12;f++)for(let s=1;s<6;s++)
 assert.ok(position(s,f).y>position(s-1,f).y,`Bass string ${s+1} below ${s}, fret ${f} (vista del guitarrista)`);
for(const viewportWidth of [562,802,900,982,1098]){
 const scale=viewportWidth/1100;
 for(let s=0;s<6;s++)for(let f=0;f<=12;f++){
  const p=position(s,f),screen={x:p.x*scale,y:p.y*scale};
  assert.deepEqual(hitPosition({x:screen.x/scale,y:screen.y/scale}),[s,f]);
 }
 const labels=stringLabels(viewportWidth);
 for(let s=1;s<6;s++)assert.ok((labels[s].label.y-labels[s-1].label.y)*scale>=19.99,'Labels have at least 20 CSS pixels between baselines');
 for(const x of [0,fret(12)])for(const side of [-1,1]){
  const p=project(x,side*width(x)/2);
  assert.ok(p.x>0&&p.x<1100&&p.y>0&&p.y<460,'Entire nut and twelfth fret fit');
 }
}
for(let s=1;s<6;s++)assert.ok(STRING_DIAMETERS[s]>STRING_DIAMETERS[s-1]);
console.log('PASS: bass below treble (guitarist view) at every fret; responsive hit mapping, full nut/12th fret, separated labels and graded string diameters.');
