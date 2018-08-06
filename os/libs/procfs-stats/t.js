var proc = require('./')
var c = 0

action()

function action(){
  ++c
  var t = Date.now()
  proc.tcp(function(err,data){
    var end = Date.now()

    //console.log(data)

    console.log(end-t,'ms')
    if(c === 100) return
    setImmediate(function(){
      action()
    })
  })
}



