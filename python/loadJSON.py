# Python file for loading a relationship graph from JSON
import sys
import json

def stringToArr(string):
    return_arr = []
    for ent in string[1:-1].split('], ['):
        return_arr.append(ent.split(', '))
    return return_arr

def solrResponseJSON(response):
    return json.load(response)['response']['docs']

def loadJSONArray(jsonArr):
    timesSeen = dict()
    links = dict()
    for obj in jsonArr:
        codes = stringToArr(obj['abstract_snomed_ents'])
        print(obj)
        print(codes)
        for idx, code in enumerate(codes):
            if len(code) < 4:
                break
            timesSeen[code[2]] = 1 if code[2] not in timesSeen else timesSeen[code[2]] + 1
            offset = idx + 1
            while offset < len(codes):
                print(codes[offset])
                if int(codes[offset][0]) - int(code[1]) > 10:
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


if __name__ == '__main__':
    with open('headache.txt', 'r') as file:
        print(loadJSONArray(solrResponseJSON(file)))
