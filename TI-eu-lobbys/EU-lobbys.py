
#problems with DGs
#Themes only connected to 1. Remove?

from datetime import date
import sys
import collections
import os
import shutil
import pandas as pd
import unicodedata


import csv
import json


sample=False #20 premieres entrees uniquement (pour dev)
sampleStr="-sample-" if sample else ""


def printjs(s):
    print(json.dumps(s, indent=4, sort_keys=True, ensure_ascii=False))


filename=sys.argv[1] if len(sys.argv)>1 else 'eu-lobbys'


verbosis=False

today = str(date.today())
print( filename,today)

#save=False





import json

# Opening JSON file



nodes={'root':{'name':'EU meetings'},'Cabinets':{'parentId':'root','expanded':'true'},
            'Directors Generals':{'parentId':'root'},
            'Lobbies':{'parentId':'true'},
            'Themes':{'parentId':'root'},
            'Unknown':{'parentId':'Lobbies'}
        }

#https://www.integritywatch.eu/data/ecmeetings/organizations.csv
#https://www.integritywatch.eu/data/organizations.csv
orgas=pd.read_csv("organizations.csv",sep=",",keep_default_na=False)
orgas2=pd.read_csv("organizations2.csv",sep=",",keep_default_na=False)
orgas=orgas.set_index("Id").drop(columns=['n','FTE'])
orgas2=orgas2.set_index("Id").drop(columns=['n','FTE'])


orgas=orgas.rename(columns={'RegDate':'Registration date',
                            'Interests_represented':'Interests represented',
                            'People':'Number of employees',
                            'Budget':'Estim. Annual Budget (€)',
                            'meetingsNum':'Number of meetings (delete?)',
                            'Accred':'Accredited lobbyists',
                            'FoI':'Portfolio'
                            })

orgas2=orgas2.rename(columns={'RegDate':'Registration date',
                            'People':'Number of employees',
                            'Meetings':'Number of meetings (delete?)',
                            'Accred':'Accredited lobbyists',
                            'FoI':'Portfolio',
                            'Cat':'Type'
                            })

orgas=orgas.to_dict(orient="index")
orgas2=orgas2.to_dict(orient="index")


FoI=set()


links=[]

for o in orgas:
    org=orgas[o].copy()
    cat=org['Cat']
    del org['Cat']
    del org['Name']
    org['All data']={"value":" ","url":"https://ec.europa.eu/transparencyregister/public/consultation/displaylobbyist.do?id="+o}
    nodes[o]={'name':orgas[o]['Name'],'parentId':cat,'options':org}
    for pf in org['Portfolio'].split(','):
        if pf not in nodes:
            nodes[pf]={'parentId':'Themes'}
            links.append({'source':pf,'target':o})
    FoI.update(org['Portfolio'].split(','))
    if cat not in nodes:
        nodes[cat]={'id':cat,'parentId':'Lobbies'}

for o in orgas2:
    thing=orgas2[o]['Name'].startswith('GLOBALF')
    org=orgas2[o].copy()
    print(org)
    cat=org['Cat2']
    del org['Cat2']
    del org['Name']
    org['All data']={"value":" ","url":"https://ec.europa.eu/transparencyregister/public/consultation/displaylobbyist.do?id="+o}
    if o in nodes:
        new={'name':orgas2[o]['Name'], 'parentId':max([cat,nodes[o]['parentId']],key=len), 'options': {**org,**nodes[o]['options']}}
        printjs(org)
        printjs(nodes[o])
        stop=True
    else:
        new={'name':orgas2[o]['Name'],'parentId':cat,'options':org}
        stop=False
    nodes[o]=new.copy()
    if thing:
        printjs(nodes[o])
    for pf in org['Portfolio'].split(','):
        if pf not in nodes:
            nodes[pf]={'parentId':'Themes'}
            links.append({'source':pf,'target':o})
    FoI.update(org['Portfolio'].split(','))
    if cat not in nodes:
        nodes[cat]={'id':cat,'parentId':'Lobbies'}



#https://www.integritywatch.eu/data/ecmeetings/ecmeetings.json
f = open(filename+'.json',encoding='utf-8')

# returns JSON object as
# a dictionary
data = json.load(f)
if sample:
    data=data[0:20]
# Iterating through the json
# list

cats= set()#primary cat
cat2s= set()#option
catandcats= set()
cabinets= set()
keys=set()
promotes_their_own=set()
advances_interests=set()
hostsizes={}
unknown_orgs=set()
dgnames=set()

#allKeys=set()
counter=0

FoI2=set()

graph=''
graphNodes={}

for meeting in data:
    #allKeys |= set(firme.keys())
    counter=counter+1
    #printjs(firme)
    print(counter)
    printjs(meeting)
    print('********')

    FoI2.update(meeting['portfolio'])

    optMeeting=meeting.copy()
    printjs(meeting)
    optMeeting.pop('Cat')
    optMeeting.pop('Cat2')
    optMeeting.pop('Org')
    optMeeting.pop('OrgId')
    #input(optMeeting)
    for host in meeting['Host']:
        hostName=host.split(" (Cabinet member)")[0]
        if 'cabinet' in meeting:
            cab=meeting['cabinet'].split("Cabinet of ")[1]
            hostParent=cab
            if cab not in nodes:
                nodes[cab]={'name':cab,'parentId':'Cabinets'}
        else:
            dgn=meeting['dgname']
            hostParent=dgn
            if dgn not in nodes:
                nodes[dgn]={'parentId':'Directors Generals'}
            dgnames.add(meeting['dgname'])
            #input(meeting)



        if hostName not in nodes:
            nodes[hostName]={'name':hostName,'parentId':hostParent}


        
        if meeting['OrgId'] not in nodes:
            if meeting['Cat']=='':
                meeting['Cat']='Unknown'
            nodes[meeting['OrgId']]={'name':meeting['Org'],'options':{'unknown org':'yes'},'parentId':meeting['Cat']}
            unknown_orgs.add(meeting['Org'])
            classe=meeting['Cat']
        else:
            if meeting['Cat']=='':
                classe=nodes[meeting['OrgId']]['parentId']
            else:
                classe=meeting['Cat']

        #elif meeting['Cat']!='':
        #    nodes[meeting['OrgId']]['parentId']=meeting['Cat']

            

        graphNodes[hostName]='hosts'
        graphNodes[meeting['Org']]=classe


        graph+=hostName+';'+meeting['Org']+'\n'
        link={'source':meeting['OrgId'],'target':hostName,'options':optMeeting}
        #input(link)

        for pf in meeting['portfolio']:
            if pf not in nodes:
                nodes[pf]={'parentId':'Themes'}
                links.append({'source':pf,'target':hostName})

        links.append(link)

    # print(meeting['Org'])
    # cats.add(meeting['Cat'])
    # cat2s.add(meeting['Cat2'])
    # if meeting['Cat2']=='Promotes their own interests or the collective interests of their members':
    #     promotes_their_own.add(meeting['Cat'])
    #     promotes_their_own.add(meeting['Org'])
    #
    # if meeting['Cat2']=='Advances interests of their clients':
    #     advances_interests.add(meeting['Cat'])
    #     advances_interests.add(meeting['Org'])
    # catandcats.add(meeting['Cat']+' - '+meeting['Cat2'])
    # if 'cabinet' in meeting.keys():
    #     cabinets.add(meeting['cabinet'])
    # keys.update(meeting.keys())
    #
    # hostsizes[len(meeting['Host'])]=meeting






    #x=raw_input('press any key')
f.close()


# Closing file

print('cats',cats)
print('cat2s',cat2s)
print('catandcats')
for val in sorted(catandcats):
    print(val)
print('cabinets',cabinets)
print('keys',keys)
print('promotes_their_own',promotes_their_own)
print('advances_interests',advances_interests)
print('host sizes')
printjs(hostsizes)
print('unknown orgs',unknown_orgs)
print('dgn',dgnames)

result={"nodes":nodes,"links":links}



with open("eu-lobbys-gf.json", "w+") as jsonFile:
        jsonFile.seek(0)
        jsonFile.write(json.dumps(result, indent = 4))#, separators = (',', ':'))#, sort_keys=True)
        jsonFile.truncate()



with open("edges.csv", "w+") as edgesFile:
        edgesFile.seek(0)
        edgesFile.write(graph)
        edgesFile.truncate()

csvString=''
for key in graphNodes:
    csvString+=key+';'+graphNodes[key]+'\n'

with open("nodes.csv", "w+") as nodesFile:
        nodesFile.seek(0)
        nodesFile.write(csvString)
        nodesFile.truncate()