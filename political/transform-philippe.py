import json
import pandas as pd


with open('Philippe-II.json') as f:
  old_db= json.load(f)#[0:max]
#print(json.dumps(isit_db, indent=4, sort_keys=True))


# with open("taxo-short.json", "w+") as jsonFile:
#   jsonFile.seek(0) 
#   json.dump(isit_db, jsonFile,  indent=4, separators=(',', ': '))
#   jsonFile.truncate()

nodes=[]
links=[] 

for i in range(len(old_db)):
  n=old_db[i]
  if (n['id']!=""):
    nodes.append({key:n[key] for key in n.keys() if key!="link"})
  l=n['link']
  if l["target"]!="":
    if l['source']=="":
      print(n,l)
      input('pb')
    links.append(n['link'])


with open("Philippe-II-2018.json", "w+") as jsonFile:
  jsonFile.seek(0) 
  json.dump({"nodes":nodes,"links":links}, jsonFile,  indent=4, separators=(',', ': '))
  jsonFile.truncate()