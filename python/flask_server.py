from flask import Flask, render_template, jsonify
import re
import requests
from loadJSON import *
app = Flask(__name__)

@app.route('/')
def homePage():
    return render_template('index.html')

@app.route('/<query>')
def queryServer(query):
    print(query)
    #Stry:
    if re.match("^[A-Za-z\s]+$", query):
        queryTerms = query.split(' ')
        requestUrl = 'http://10.4.80.108:8984/solr/MEDLINEv6/select'
        params = {
            "q": "{titleQueries} OR {abstractQueries}".format(titleQueries= " OR ".join(['title:' + i for i in queryTerms]), abstractQueries=" OR ".join(['abstract:' + i for i in queryTerms])).encode('utf-8'),
            "rows": "50"
        }
        r = requests.get(requestUrl, params=params)
        ret = loadJSONArray(r.json())
        return jsonify(ret)
    return 'Error: Query can only contain letters and spaces'

    #except Exception as e:
    #    return str(e)

    

if __name__ == "__main__":
    app.run(debug=True)