import json
import pandas as pd
import sys
import time


root="179913"
maxGen=100
limit=80000#max number of entries
file='/Users/raphael/Desktop/animals/taxo_complete_params'
output=file+"-"+root+"-"+str(maxGen)


print('import',file+'.json')

#print('method 0')
start0 = time.time()

df=pd.read_json(file+'.json')


print('kids')
with open('/Users/raphael/Desktop/animals/taxo_complete_children.json', "r+") as jsonFile:
    kids = json.load(jsonFile)
print(kids,kids['82709'])
df.set_index('id',drop=False,inplace=True)
print(df)
intermed0=time.time()
print('elapsed',intermed0-start0)

db=df.to_dict(orient='index')

intermedbis0=time.time()
print('elapsed,',intermedbis0-intermed0)

print('rootNode',db[root])
#rootNode['parentId']=="root"
toCheck=[root]
results=toCheck
for gen in range(maxGen):
    exceed=len(results)+len(toCheck)-limit
    if exceed>0:
        print(exceed,'cutting at limit '+str(limit))
        file+='-limit-'+str(limit)+'-'
        toCheck=toCheck[0:max(0,len(toCheck)-exceed)]
    print('generation',gen,', in file:',len(results),', to check:',len(toCheck))
    children=[]
    print('seek children')
    for id in toCheck:
        children+=kids[str(id)]
        #[t for t in db if (t['parentId']==tax['id'] and t['id']!=root)]#sinon problème quand root="root"...
    print('ok')
    results+=children
    toCheck=children
print('done')
sys.stdout.write('\a')
#taxon_results=[t for t in results if t['id'] in results]
if root!="root":#besoin de créér un abstract root
    p=db[db[root]['parentId']]
    db[root]['parentId']="root"
    print('parentNode',p)
    #parentName=next(str(t['firstName'])+' '+str(t['lastName']))
    db['root']={"id": "root",
                        "parentId": "root",
                        "name": p['name'],
                        "expanded": "true",
                        "params": []
                        }
                    
    results=["root"]+results
export = {"params":{"belongsToLinkWidth":10},
            "nodes":[db[str(t)] for t in results],
            "links":[]
}

with open(output+".json", "w+") as jsonFile:
    jsonFile.seek(0) 
    json.dump(export, jsonFile,  indent=4, separators=(',', ': '))
    jsonFile.truncate()

end0=time.time()
print(end0-intermedbis0,'elapsed, total:',end0-start0)

# doMethod1=False
# if doMethod1:#much faster
#     print('method 1')
#     print(file+'.json')
#     start = time.time()
#     df=pd.read_json(file+'.json')

#     db=df.to_dict()
    
#     intermed=time.time()
#     print(intermed-start,"elapsed")

#     #df.set_index('id',inplace=True)
#     sys.stdout.write('\a')
#     toCheck=[root]
#     results=[root]
#     for gen in range(maxGen):
#         print(gen)
#         print('to check',toCheck)
#         input('?')
#         children=[]
#         for id in toCheck:
#             print('child of ',id)
#             children+=df[df['parentId']==id]['id'].tolist()
#         results+=children
#         toCheck=children
#     sys.stdout.write('\a')
#     df_results=df[df['id'].isin(results)]
#     df_results.to_json(output+'-1.json',orient="records",indent=4)


#     end = time.time()
#     print(end - intermed," elapsed, total",end-start)



# doMethod2=False
# if doMethod2:
#     print('method 2')
#     start2=time.time()



#     with open(file+".json", "r+") as jsonFile:
#         db = json.load(jsonFile)


#     #df.set_index('id',inplace=True)
#     sys.stdout.write('\a')
#     intermed2=time.time()
#     print(intermed2-start2,"elapsed")
#     toCheck=[t for t in db if t['id']==root]
#     results=toCheck
#     results[0]['parentId']=="root"
#     for gen in range(maxGen):
#         print(gen)
#         children=[]
#         for tax in toCheck:
#             children+=[t for t in db if t['parentId']==tax['id']]
#         results+=children
#         toCheck=children
#     sys.stdout.write('\a')
#     #taxon_results=[t for t in results if t['id'] in results]

#     results = {"params":{"belongsToLinkWidth":10},
#                 "nodes":[{"id": "root",
#                             "parentId": "root",
#                             "expanded": "true",
#                             "params": []
#                             }
#                         ]+results,
#                 "links":[]
#     }

#     with open(output+"-2.json", "w+") as jsonFile:
#         jsonFile.seek(0) 
#         #est-ce que ca marche si le nombre de commandes diminue?
#         json.dump(results, jsonFile,  indent=4, separators=(',', ': '))
#         jsonFile.truncate()

#     end2=time.time()
#     print(end2-intermed2,'elapsed, total:',end2-start2)
