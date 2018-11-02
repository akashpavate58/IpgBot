var express=require('express');
var app=express();
app.get('/irwin/Contact',function(req,res){
    req.query.$filter;
    console.log(req.query.$filter);

    res.send("hi");
})
app.listen(3000,function(){
    console.log("server is running at 3000");
})
