# Python file for loading a relationship graph from JSON
import json
import re
import math
import operator

# Helper for properly splitting the abstract_snomed_ents field
def stringToArr(string):
    return_arr = []
    for ent in string[1:-1].split('], ['):
        return_arr.append(ent.split(', '))
    return return_arr

# Magic number 50: only returning the first 50 results for now
# simplified formula of (time seen together/50)/(n1/50 * n2/50) to time seen together * 50/ (n1 * n2)
def calcPMI(node1, node2, timesSeen):
    return math.log2(50*timesSeen/(node1["timesSeen"] * node2["timesSeen"]))


# Format info for response
def dictsToJSONResp(nodes, links, overlap):
    # TODO: Make sorting more efficient (binary insertion instead of using sort function)
    # Currently sorting results due to past efforts to make more efficient, can likely be removed
    return {
        "nodes": sorted([{"code": k, "timesSeen": v["timesSeen"], "name": v["name"], "type": v["type"]} for k, v in nodes.items()], key= lambda x: x["timesSeen"]),
        "links": sorted([{"source": k[0], "target": k[1], "timesSeen": v , "pmi": calcPMI(nodes[k[0]], nodes[k[1]], v), "overlap": k in overlap} for k, v in links.items()], key= lambda x: x["pmi"])
    }

# Main function called from flask_server to calculate nodal information
def loadJSONArray(jsonResp, SNOMEDLinks, semanticTypes):
    nodes = dict()  # Dictionary of node ID to node information dictionary
    links = dict() # Dictionary of link tuple to times seen
    overlapLinks = set()    # represents links found in SNOMEDLinks and in the server query

    for obj in jsonResp['response']['docs']:
        # TODO: also look at title_snomed_ents
        codes = stringToArr(obj['abstract_snomed_ents'])   
        seenCodes = set()
        for code in codes:
            # Handle edge case where codes not in tuple format
            if len(code) < 4:
                break
            
            # currently looking only at the first code and stripping out any possible non-numbers
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
                
        # seenLinks holds all of the links seen in this entry
        # This code only counts if the link exists in the entry. If it is seen more than once, the timesSeen isn't increased
        seenLinks = set()
        for idx, code in enumerate(codes):
            if len(code) < 4:
                break
            
            # Get the number code for the code being examined
            # the regex looks at the first code in the last entry of the 4 tuple and strips out the letters
            smID1 = re.sub(r'[^0-9]+', '', code[2].split(';')[-1].split(',')[0])
            # Check backward a distance of 5 spots at most
            offset = idx - 1
            while offset > 0 and int(code[0]) - int(codes[offset][1]) <= 5:
                # Get the examined code for the offset
                smID2 = re.sub(r'[^0-9]+', '', codes[offset][2].split(';')[-1].split(',')[0])
                link = (smID1, smID2)
                if link not in seenLinks:
                    # Links are not directed. The smallest code should be first so a link isn't accidentally counted twice
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

    return dictsToJSONResp(nodes, links, overlapLinks)
