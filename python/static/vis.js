const messagePattern = new RegExp('^[A-Za-z0-9][A-Za-z0-9\\s]*$');

function graphDetails(details, target){
    console.log(details);
    target.append("rect")
        .style("width", "150")
        .style("height", "100")
        .style("fill", "rgb(50, 157, 168)")
        .attr("x", details.x - 75)
        .attr("y", details.y + 100 + details.r);

    target.append("text")
        .style("fill", "rgb(255, 255, 255)")
        .attr("x", details.x)
        .attr("y", details.y)
        .text(details.name);
}

// Much of the code here derived from https://www.d3-graph-gallery.com/graph/network_basic.html
function createGraph(data){
    let svg = d3.select('#graph_canvas')
    .call(d3.zoom().on("zoom", function () {
        svg.attr("transform", d3.event.transform)
    })) // found at https://coderwall.com/p/psogia/simplest-way-to-add-zoom-pan-on-d3-js
    .append('g');

    let link = svg
    .selectAll("line")
    .data(data.links)
    .enter()
    .append("line")
    .style("stroke", "#aaa")
    .style('stroke-width', l=>Math.log(l.timesSeen)+1);

    let node = svg
    .selectAll("circle")
    .data(data.nodes)
    .enter()
    .append("circle")
    .attr("r", n=>Math.log(n.timesSeen)+1)
    .style("fill", "#69b3a2")
    .on("mouseover", (d)=>graphDetails(d, svg));
    //.on("mouseout", ()=>{d3.selectAll("rect").remove(); d3.selectAll("text").remove()});

    let simulation = d3.forceSimulation(data.nodes)        
      .force("link", d3.forceLink()                               
            .id(node=>node.code)                   
            .links(data.links)                                    
      )
      .force("charge", d3.forceManyBody().strength(-400))         
      .force("center", d3.forceCenter(400, 400))    
      .on("end", ticked);

    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    }
    
}

document.getElementById("submit").addEventListener('click', ()=>{
    errMsg = document.getElementById("err_msg");
    input = document.getElementById('query').value;
    if (!messagePattern.test(input)){
        console.log(input);
        errMsg.innerHTML = 'Must be a valid query (only letters and spaces)';
    } else {
        errMsg.innerHTML = '';
        console.log(input);
        fetch('http://127.0.0.1:5000/' + input)
        .then(resp=>{
            return resp.json();
        })
        .then(obj=>{
            console.log(obj);
            createGraph(obj);
        })
        .catch(err=>{
            console.log('error:');
            errMsg.innerHTML = err.toString();
        });
    }
    

});

