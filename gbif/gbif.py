import requests 
import json


def printjs(s):
    print(json.dumps(s, indent=4, sort_keys=True))

x=requests.get('https://api.gbif.org/v1/occurrence/2405267252')

printjs(x.json())