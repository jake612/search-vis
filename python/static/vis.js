const messagePattern = new RegExp('^[A-Za-z\s]+$');

// Much of the code here derived from https://www.d3-graph-gallery.com/graph/network_basic.html
function createGraph(data){
    let svg = d3.select('#graph-canvas')
    .attr('width', 800)
    .attr('height', 800)
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
    .on("mouseover", function(d){console.log(this); console.log(d)});

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

