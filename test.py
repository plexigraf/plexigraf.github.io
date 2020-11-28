import json
import pandas as pd
import sys
import time


root="602"
maxGen=2
file='/Users/raphael/Desktop/animals/taxo_complete'
output=file+root+"-"+str(maxGen)

print('method 1')

start = time.time()
df=pd.read_json(file+'.json')

intermed=time.time()
print(intermed-start,"elapsed")


print('method 2')
start2=time.time()



with open(file+".json", "r+") as jsonFile:
    db = json.load(jsonFile)


#df.set_index('id',inplace=True)
sys.stdout.write('\a')
intermed2=time.time()
print(intermed2-start2,"elapsed")