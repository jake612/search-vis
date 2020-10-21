# Python file for loading a relationship graph from JSON
import json
import re

def stringToArr(string):
    return_arr = []
    for ent in string[1:-1].split('], ['):
        return_arr.append(ent.split(', '))
    return return_arr


def dictsToJSONResp(nodes, links, overlap):
    return {
        "nodes": [{"code": k, "timesSeen": v["timesSeen"], "name": v["name"]} for k, v in nodes.items()],
        "links": [{"source": k[0], "target": k[1], "timesSeen": v } for k, v in links.items()],
        "overlap": [{"source": k[0], "target": k[1], "timesSeen": 1} for k in overlap]
    }

def loadJSONArray(jsonResp, SNOMEDLinks):
    nodes = dict()
    links = dict()
    overlapLinks = set()
    for obj in jsonResp['response']['docs']:
        codes = stringToArr(obj['abstract_snomed_ents'])
        for code in codes:
            if len(code) < 4:
                break
            smID = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
            if smID in nodes:
                nodes[smID]["timesSeen"] += 1
            else:
                newNode = {
                    "name": re.sub(r'[^A-Za-z0-9\s]+', '', code[3]),
                    "timesSeen": 1
                }
                nodes[smID] = newNode


        for idx, code in enumerate(codes):
            if len(code) < 4:
                break
            
            offset = idx - 1
            # Check backward 5
            while offset > 0:
                if int(code[0]) - int(codes[offset][1]) <= 5:
                    smID1 = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
                    smID2 = re.sub(r'[^0-9]+', '', codes[offset][2].split(';')[-1].split(',')[0])
                    link = (smID1, smID2)
                    if smID2 < smID1:
                        link = (smID2, smID1)

                    if link in links:
                        links[link] += 1
                    else:
                        links[link] = 1
                    if link in SNOMEDLinks:
                        overlapLinks.add(link)
                    offset -= 1
                else:
                    break

            offset = idx + 1
            # Check forward 5
            while offset < len(codes):
                if int(codes[offset][0]) - int(code[1]) <= 5:
                    smID1 = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
                    smID2 = re.sub(r'[^0-9]+', '', codes[offset][2].split(';')[-1].split(',')[0])
                    link = (smID1, smID2)
                    if smID2 < smID1:
                        link = (smID2, smID1)

                    if link in links:
                        links[link] += 1
                    else:
                        links[link] = 1
                    if link in SNOMEDLinks:
                        overlapLinks.add(link)
                    offset += 1
                else:
                    break

    return dictsToJSONResp(nodes, links, overlapLinks)
