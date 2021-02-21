const messagePattern = new RegExp('^[A-Za-z0-9][A-Za-z0-9\\s]*$'); // Regex to prevent invalid queries (empty, etc) from being entered
var isDisplayingGraph = false;  // Used for checking if valid graph done to prevent user from changing things during graph load
// current threshold values
var pmiThresh = 1;
var termThresh = 1;
var isOntGraph = false; // Indicates which type of graph being viewed

// Graph data
let svg, node, link, simulation, graphData;

// Hidden set is the set of all nodes that are currently invisible
// It is used to ensure lines aren't visible unless both nodes are visible
let hiddenNodeSet = new Set();

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
            return "rgb(125, 122, 120)"; // fallback for error
    }
}

// Function for displaying details of a node when moused over
// Rough state, could be much improved
// TODO: only display if target node is visible
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

    // Sets the link threshold to the current selected value and adjusts the slider's range from smallest returned pmi to the largest
    var linkThresh = document.getElementById("link_thresh_num");
    linkThresh.setAttribute("min", graphData.links[0].pmi);
    linkThresh.setAttribute("max", graphData.links[graphData.links.length - 1].pmi);

    // Set maximum times seen slider value to the node with the most times seen
    document.getElementById("term_thresh_num").setAttribute("max", graphData.nodes[graphData.nodes.length - 1].timesSeen);

    // Create canvas and enable zooming/panning
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
        .style("stroke-opacity", l=>l.pmi < pmiThresh ? "0" : "1"); // Set visibility based on threshold

    node = svg
        .selectAll("circle")
        .data(data.nodes)
        .enter()
        .append("circle")
        .attr("r", n=>(Math.log(n.timesSeen)+1)*5) // Ad hoc method for determining node size based on times seen, to be improved
        .style("fill", n=>nodeColor(n.type))
        .on("mouseover", (d)=>graphDetails(d, svg))
        .on("mouseout", ()=>{d3.selectAll("rect").remove(); d3.selectAll("text").remove()}); // Remove details box on mouseout

    // Create simulation
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

// Called when user clicks the button to send query to server
document.getElementById("submit").addEventListener('click', ()=>{
    errMsg = document.getElementById("err_msg");
    input = document.getElementById('query').value;
    if (!messagePattern.test(input)){
        errMsg.innerHTML = 'Must be a valid query (only letters and spaces)';
    } else {
        // Clears graph if one exists
        if (isDisplayingGraph){
            d3.select("#graph_canvas").selectAll("*").remove();
        }
        errMsg.innerHTML = '';

        // Sends query to server (Currently hardcoded to localserver port 5000)
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

// Function handles change to slider controlling link PMI threshold
// Possible TODO: make more efficient instead of refiltering on every change
document.getElementById("link_thresh_num").addEventListener('input', ()=>{
    if (!isDisplayingGraph || isOntGraph) return; // Exit cases where PMI doesn't matter

    let threshVal = Number(document.getElementById("link_thresh_num").value);
    if (threshVal == pmiThresh) return;

    // If either node is in the hidden set (see term_thresh_num function below) or has a pmi less that the thresh, it is set to transparent. Otherwise it is opaque
    d3.selectAll("line").style("stroke-opacity", l=> (hiddenNodeSet.has(l.target)||hiddenNodeSet.has(l.source)) || l.pmi < pmiThresh ? "0" : "1");

    document.getElementById("pmi_seen").innerHTML = threshVal.toFixed(4);
    pmiThresh = threshVal; // New PMI is the threshvalue

});

// Function handles change to slider controlling term times seen threshold
// Possible TODO: make more efficient instead of refiltering on every change
document.getElementById("term_thresh_num").addEventListener('input', ()=>{
    if (!isDisplayingGraph) return;
    let threshVal = Number(document.getElementById("term_thresh_num").value);
    // working off https://bl.ocks.org/colbenkharrl/21b3808492b93a21de841bc5ceac4e47
    if (threshVal == termThresh) return;

    // Generate the set of hidden nodes based on if they are below the threshold
    hiddenNodeSet = new Set(graphData.nodes.filter(n=> n.timesSeen < threshVal));
    

    if (isOntGraph){
        d3.selectAll("line")
        .style('stroke-width', 8)
        .style("stroke-opacity",  l=>  (hiddenNodeSet.has(l.target) || hiddenNodeSet.has(l.source)) || l.overlap === false ? "0" : "1");
    } else {
         // If either node is in the hidden set (see term_thresh_num function below) or has a pmi less that the thresh, it is set to transparent. Otherwise it is opaque
        d3.selectAll("line").style("stroke-opacity", l=> (hiddenNodeSet.has(l.target) || hiddenNodeSet.has(l.source)) || l.pmi < pmiThresh  ? "0" : "1");

    }
    


    // Set node opacity
    d3.selectAll("circle").style("opacity", l=>l.timesSeen < threshVal ? "0" : "1");
    document.getElementById("term_seen").innerHTML = threshVal;
    termThresh = threshVal; // Term threshold set to new value

});

// Function controls switching between viewing the ontology results and the search results
document.getElementById("ont_results").addEventListener('click', ()=>{
    if (!isDisplayingGraph) return;
    if (!isOntGraph){
        // Switch to ontology graph
        isOntGraph = true;
        document.getElementById("ont_results").innerText = "View query results";
        // Only allow lines in the overlapping ontology results
        d3.selectAll("line")
            .style('stroke-width', 8)
            .style("stroke-opacity", l=>l.overlap === false ? "0" : "1");

    } else {
        // Switch to search results and filter for pmi thresh
        isOntGraph = false;
        document.getElementById("ont_results").innerText = "View ontology results";
        lines = d3.selectAll("line")
            .style('stroke-width', l=>Math.log2(l.timesSeen)+1)
            .style("stroke-opacity", l=>l.pmi < Number(document.getElementById("link_thresh_num").value) ? "0" : "1");
    }

});

