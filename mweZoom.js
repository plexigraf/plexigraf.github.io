
mobile = window.screen.width<800 //false enleverait l'affichage d'infos
width = mobile?  document.body.clientWidth : window.screen.width, // svg width
height = width*1.5// svg height


const body = d3.select("body");

const canvas = body.append("svg").attr("id", "canvas")
    .style("border", "1px solid #ccc")
    .attr("width", width)
    .attr("height", height),
    zoomCanvas = canvas.append("svg").attr("width", width).attr("id", "zoomCanvas")
    .attr("height", height);

//necessaire pr zoom
zoomCanvas.append("rect")
    .attr("width", width)
    .attr("height", height).attr("opacity", .1);

//html structure:canvas - [ infog, zoomCanvas [ vis [ nodeg, linkg, hullg ]]]
const vis = zoomCanvas.append("g").attr("id", "vis");


nodeg = vis.append("g").attr("id", "nodeg").append("circle").attr("r", 30)
.attr("cx", 100)
.attr("cy", 100)
.attr("fill","red")
; //nodeuds

const zoom = d3.behavior.zoom()
    .scaleExtent([.1, 10])
    .scale(1)
    .on("zoom", zoomed);


zoomCanvas.on("mouseover", function() {
        d3.select(this).style("cursor", "all-scroll")
    })
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.event);


    function zoomed() {
      let x=d3.event.translate[0]
      let y=d3.event.translate[1]
        /*prevTgt=msTgt;
        msTgt="root"//d3.event.sourceEvent.target.id||"root";
        if (msTgt==="canv" && prevTgt==="canv") {*/
        vis.attr("transform", "translate(" +( x)+","+(y) + ")scale(" + (d3.event.scale) + ")")
        //infoG.attr("transform", "translate(0,"+d3.event.translate[0]+")")
    }
