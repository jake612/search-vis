# Python file for loading a relationship graph from JSON
import json

def stringToArr(string):
    return_arr = []
    for ent in string[1:-1].split('], ['):
        return_arr.append(ent.split(', '))
    return return_arr

def solrResponseJSON(response):
    return json.load(response)['response']['docs']

def loadJSONArray(jsonArr):
    nodes = dict()
    links = dict()
    for obj in jsonArr:
        codes = stringToArr(obj['abstract_snomed_ents'])
        for code in codes:
            if len(code) < 4:
                break
            nodes[code[2]] = {
                name: code[3],
                timesSeen: 1,
            } if node[2] not in nodes else nodes[code[2]].timesSeen += 1
        for idx, code in enumerate(codes):
            if len(code) < 4:
                break
            node[code[2]] = {} if node[2] not in timesSeen else timesSeen[code[2]] + 1
            offset = idx + 1
            while offset < len(codes):
                if int(codes[offset][0]) - int(code[1]) <= 10:
                    break
                else:
                    link = (code[2], codes[offset][2])
                    if code[2] < codes[offset][2]:
                        link = (codes[offset][2], code[2])

                    if link in links:
                        links[link] += 1
                    else:
                        links[link] = 1
                    offset += 1

    return timesSeen, links
