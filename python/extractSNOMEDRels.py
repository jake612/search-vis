import sys
import pickle

if __name__ == '__main__':
    try:
        ret_set = set()
        with open(sys.argv[1], 'r') as file:
            file.readline()
            for line in file:
                parts = line.split('\t')
                code1 = parts[4]
                code2 = parts[5]
                if code1 < code2:
                    pair = (code1, code2)
                else:
                    pair = (code2, code1)
                ret_set.add(pair)
            print(sys.getsizeof(ret_set))

        pickle.dump(ret_set, open('edges.p', 'wb'))                
				 
    except Exception as e:
        print(e)
