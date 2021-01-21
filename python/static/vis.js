const messagePattern = new RegExp('^[A-Za-z0-9][A-Za-z0-9\\s]*$');

// Used for checking if valid graph done
var isDisplayingGraph = false;
var pmiThresh = 1;
var termThresh = 1;
var isOntGraph = false;

let svg, node, link, simulation, graphData;

let hiddenSet = new Set();

// Function which, when given the semantic category, returns the fill value to color the node
function nodeColor(semanticType){
    switch(semanticType){
        case "ANAT":
            return "rgb(41, 237, 31)"; // Green
        case "DISO":;
            return "rgb(240, 53, 53)"; // Red
        case "PROC":
            return "rgb(100, 97, 250)"; // Blue
        case "CHEM":
            return "rgb(255, 239, 92)"; // yellow
        default:
            return "rgb(125, 122, 120)";
    }
}

// Function for displaying details of a node
function graphDetails(details, target){
    target.append("rect")
        .style("width", "150")
        .style("height", "100")
        .style("fill", "rgb(50, 157, 168)")
        .attr("x", details.x - 75)
        .attr("y", details.y - 100);

    target.append("text")
        .style("fill", "rgb(255, 255, 255)")
        .style("width", "150")
        .style("font-size", "15px")
        .attr("x", details.x - 75)
        .attr("y", details.y - 70)
        .text(details.name);

    target.append("text")
        .style("fill", "rgb(255, 255, 255)")
        .style("width", "150")
        .style("font-size", "15px")
        .attr("x", details.x - 75)
        .attr("y", details.y - 55)
        .text("Times Seen: " + details.timesSeen);
}

// Much of the code here derived from https://www.d3-graph-gallery.com/graph/network_basic.html
function createGraph(data){
    graphData = data;

    var linkThresh = document.getElementById("link_thresh_num");
    linkThresh.setAttribute("min", graphData.links[0].pmi);
    linkThresh.setAttribute("max", graphData.links[graphData.links.length - 1].pmi);

    document.getElementById("term_thresh_num").setAttribute("max", graphData.nodes[graphData.nodes.length - 1].timesSeen);

    svg = d3.select('#graph_canvas')
        .call(d3.zoom().on("zoom", function () {
            svg.attr("transform", d3.event.transform)
        })) // found at https://coderwall.com/p/psogia/simplest-way-to-add-zoom-pan-on-d3-js
        .append('g');

    link = svg
        .selectAll("line")
        .data(data.links)
        .enter()
        .append("line")
        .style("stroke", "#aaa")
        .style('stroke-width', l=> Math.log(l.pmi + 5) + 1)
        .style("stroke-opacity", l=>l.pmi < pmiThresh ? "0" : "1");

    node = svg
        .selectAll("circle")
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("r", n=>(Math.log(n.timesSeen)+1)*5)
        .style("fill", n=>nodeColor(n.type))
        .on("mouseover", (d)=>graphDetails(d, svg))
        .on("mouseout", ()=>{d3.selectAll("rect").remove(); d3.selectAll("text").remove()});

    simulation = d3.forceSimulation(data.nodes)        
      .force("link", d3.forceLink()                               
            .id(node=>node.code)                   
            .links(data.links)                                    
      )
      .force("charge", d3.forceManyBody().strength(-550))         
      .force("center", d3.forceCenter((window.innerWidth * .8) / 2, 500))    
      .on("end", ticked);


    isDisplayingGraph = true;
    
}

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


document.getElementById("submit").addEventListener('click', ()=>{
    errMsg = document.getElementById("err_msg");
    input = document.getElementById('query').value;
    if (!messagePattern.test(input)){
        errMsg.innerHTML = 'Must be a valid query (only letters and spaces)';
    } else {
        errMsg.innerHTML = '';
        fetch('http://127.0.0.1:5000/' + input)
        .then(resp=>{
            return resp.json();
        })
        .then(obj=>{
            console.log(obj);
            if (isDisplayingGraph){
                d3.selectAll("svg > *").remove();
            } 
            createGraph(obj);
        })
        .catch(err=>{
            errMsg.innerHTML = err.toString();
        });
    }

});

document.getElementById("link_thresh_num").addEventListener('input', ()=>{
    if (!isDisplayingGraph || isOntGraph) return;
    let threshVal = Number(document.getElementById("link_thresh_num").value);
    // working off https://bl.ocks.org/colbenkharrl/21b3808492b93a21de841bc5ceac4e47
    if (threshVal == pmiThresh) return;

    d3.selectAll("line").style("stroke-opacity", l=> (hiddenSet.has(l.target)||hiddenSet.has(l.source)) || l.pmi < pmiThresh ? "0" : "1");

    document.getElementById("pmi_seen").innerHTML = threshVal.toFixed(4);
    pmiThresh = threshVal;

});

document.getElementById("term_thresh_num").addEventListener('input', ()=>{
    if (!isDisplayingGraph) return;
    let threshVal = Number(document.getElementById("term_thresh_num").value);
    // working off https://bl.ocks.org/colbenkharrl/21b3808492b93a21de841bc5ceac4e47
    if (threshVal == termThresh) return;

    hiddenSet = new Set(graphData.nodes.filter(n=> n.timesSeen < threshVal));
    
    d3.selectAll("line").style("stroke-opacity", l=> (hiddenSet.has(l.target) || hiddenSet.has(l.source)) || l.pmi < pmiThresh  ? "0" : "1");
    d3.selectAll("circle").style("opacity", l=>l.timesSeen < threshVal ? "0" : "1");
    document.getElementById("term_seen").innerHTML = threshVal;
    termThresh = threshVal;

});


document.getElementById("ont_results").addEventListener('click', ()=>{
    if (!isDisplayingGraph) return;
    if (!isOntGraph){
        isOntGraph = true;
        document.getElementById("ont_results").innerText = "View query results";
        d3.selectAll("line").style("stroke-opacity", l=>l.overlap === false ? "0" : "1");

    } else {
        isOntGraph = false;
        document.getElementById("ont_results").innerText = "View ontology results";
        lines = d3.selectAll("line")
            .style('stroke-width', l=>Math.log2(l.timesSeen)+1)
            .style("stroke-opacity", l=>l.pmi < Number(document.getElementById("link_thresh_num").value) ? "0" : "1");
    }

});

