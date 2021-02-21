# Code controls the simple api for responding to page requests and queries
# Also loads data for SNOMED edges and semantic categories

from flask import Flask, render_template, jsonify
import pickle, json, requests, re
from loadJSON import *
app = Flask(__name__)


@app.route('/')
def homePage():
    return render_template('index.html')

# TODO: descriptively handle errors thrown after regex is satisfied
@app.route('/<query>')
def queryServer(query):
    # regex to only allow letters and spaces
    if re.match("^[A-Za-z\s]+$", query):
        # Split query into multiple terms by whitespace
        queryTerms = query.split(' ')
        requestUrl = 'http://10.4.80.108:8984/solr/MEDLINEv6/query' # Hardcoded server address

        # Query is built by taking each individual word in query and searching for it in the title or abstract field
        # All of the title and abstract queries are ORed together
        # For example, a query for head trauma would search the database with the query "title: head OR title: trauma OR abstract: head OR abstract: trauma"
        params = {
            "q": "{titleQueries} OR {abstractQueries}".format(titleQueries= " OR ".join(['title:' + i for i in queryTerms]), abstractQueries=" OR ".join(['abstract:' + i for i in queryTerms])).encode('utf-8'),
            "rows": "50"
        }
        r = requests.get(requestUrl, params=params)
        
        # After response recieved, use loadJSON.py and return the result
        ret = loadJSONArray(r.json(), SNOMEDLinks, semanticTypes)
        return jsonify(ret)
    else:
        return 'Error: Query can only contain letters and spaces'


# We are using the semantic categories for coloring the nodes displayed by the graph
# This function takes the JSON and converts it to a lookup dictionary for the loadJSONArray function to use
# Each key is a type code and each entry is the category it belongs to
# Argument is the path/name of the file to load
def semanticTypesLoader(path):
    returnDict = dict()
    with open(path, 'r') as jsonFile:
        data = json.load(jsonFile)
        for categoryList in data.values():
            for entry in categoryList:
                vals = entry.split('|')
                returnDict[vals[2]] = vals[0]
    
    return returnDict
 

# Main code to process SNOMED set pickled in data under edges
if __name__ == "__main__":
    SNOMEDLinks = pickle.load(open('../data/edges.p', 'rb')) # SNOMED Links is a pre-processed set of SNOMED codes for the purpose of checking if they are in the ontology
    semanticTypes = semanticTypesLoader('../data/ctakes_semantic_types.json')
    app.run(debug=True)