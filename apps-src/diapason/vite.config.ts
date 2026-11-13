export default ({command}:{command:string}) => ({base: command === "build" ? "/apps/diapason/" : "./", server: {host:"127.0.0.1",port:5192,strictPort:true}});
