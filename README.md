# Search-Vis

Search-Vis is a simple project where queries of a Solr server containing medical research papers are mined for term cooccurence, then visually representing these relationships using a d3.js graph. It was developed in conjunction with Professor Yue Wang at UNC's SILS.

### Structure
The data folder contains the pickled file of edges found in the SNOMED ontology as well as a json file containing categorizations for later coloring. The headache.txt file was stored for testing purposes in the case of not having access to the server.

The python folder contains the code for the server (flask_server.py), the code for processing SOLR query results (loadJSON.py), the HTML (static/index.html), and the css/javascript (under static folder).

### Setup and Running

Search-Vis requires Python 3.7 and Flask to run the server. The server must be running on UNC's network to access the SOLR server.

Installing flask
```sh
$ pip install flask
```

Running Server
```sh
$ cd search-vis/python
$ python flask-server.py
```

The current version runs on port 5000 of localhost for testing purposes. Make sure the SOLR server is running at the proper address and port (found in python/flask-server.py). View the website at https://127.0.0.1:5000.

Data for edges.p pickle file and ctakes_semantic_types.json in the data folder are required for coloring nodes and finding overlap with ontology. The edges.p file can be generated using the extractSNOMEDRels.py with the SNOMED relations file as the cli argument. Any set of edges can be used for the ontology edges as long as it is a set of tuples in which the smallest code (numerically) is the first entry.

### Todos

 - Examine better usage of d3.js (Instead of making invisible, should shapes be removed from the DOM?)
 - More efficient ways to filter nodes and links
 - Unit testing for loadJSON.py, testing in general to ensure proper results
 - Improvements to node information popup

License
----

MIT
