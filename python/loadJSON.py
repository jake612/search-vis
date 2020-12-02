# Python file for loading a relationship graph from JSON
import json
import re
import math

# Helper for properly splitting the abstract_snomed_ents field
def stringToArr(string):
    return_arr = []
    for ent in string[1:-1].split('], ['):
        return_arr.append(ent.split(', '))
    return return_arr

# Magic number 50: only returning the first 50 results for now
def calcPMI(node1, node2, timesSeen):
    return math.log2(50*timesSeen/(node1["timesSeen"] * node2["timesSeen"]))


# Format info for response
def dictsToJSONResp(nodes, links, overlap):
    return {
        "nodes": [{"code": k, "timesSeen": v["timesSeen"], "name": v["name"], "type": v["type"]} for k, v in nodes.items()],
        "links": [{"source": k[0], "target": k[1], "timesSeen": v , "pmi": calcPMI(nodes[k[0]], nodes[k[1]], v)} for k, v in links.items()],
        "overlap": [{"source": k[0], "target": k[1], "timesSeen": 1} for k in overlap]
    }

# Main function called from flask_server to calculate nodal information
def loadJSONArray(jsonResp, SNOMEDLinks, semanticTypes):
    nodes = dict()
    links = dict()
    overlapLinks = set()
    for obj in jsonResp['response']['docs']:
        codes = stringToArr(obj['abstract_snomed_ents'])
        seenCodes = set()
        for code in codes:
            if len(code) < 4:
                break
            smID = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
            smTypeCode = code[2].split(';')[1].split(',')[0]
            # If not seen this result, handle and add to set
            if smID not in seenCodes:
                if smID in nodes:
                    nodes[smID]["timesSeen"] += 1
                else:
                    newNode = {
                        "name": re.sub(r'[^A-Za-z0-9\s]+', '', code[3]),
                        "timesSeen": 1,
                        "type": semanticTypes[smTypeCode]
                    }
                    nodes[smID] = newNode
                seenCodes.add(smID)
                

        seenLinks = set()
        for idx, code in enumerate(codes):
            if len(code) < 4:
                break
            offset = idx - 1
            # Check backward 5
            while offset > 0 and int(code[0]) - int(codes[offset][1]) <= 5:
                smID1 = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
                smID2 = re.sub(r'[^0-9]+', '', codes[offset][2].split(';')[-1].split(',')[0])
                link = (smID1, smID2)
                if link not in seenLinks:
                    if smID2 < smID1:
                        link = (smID2, smID1)

                    if link in links:
                        links[link] += 1
                    else:
                        links[link] = 1

                    if link in SNOMEDLinks:
                        overlapLinks.add(link)

                    seenLinks.add(link)
                offset -= 1

            offset = idx + 1
            # Check forward 5
            while offset < len(codes) and int(codes[offset][0]) - int(code[1]) <= 5:
                smID1 = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
                smID2 = re.sub(r'[^0-9]+', '', codes[offset][2].split(';')[-1].split(',')[0])
                link = (smID1, smID2)
                if link not in seenLinks:
                    if smID2 < smID1:
                        link = (smID2, smID1)

                    if link in links:
                        links[link] += 1
                    else:
                        links[link] = 1

                    if link in SNOMEDLinks:
                        overlapLinks.add(link)

                    seenLinks.add(link)
                offset += 1

        print('process')
    return dictsToJSONResp(nodes, links, overlapLinks)
