import json
from datetime import date
import sys
import collections
import os
import shutil

import unicodedata




sample=False #20 premieres entrees uniquement (pour dev)
sampleStr="-sample-" if sample else ""


def printjs(s):
    print(json.dumps(s, indent=4, sort_keys=True, ensure_ascii=False))


filename=sys.argv[1] if len(sys.argv)>1 else 'agora_repertoire_opendata'


verbosis=False

today = str(date.today())
print( filename,today)

#save=False





import json

# Opening JSON file
f = open(filename+'.json')

# returns JSON object as
# a dictionary
data = json.load(f)['publications']
if sample:
    data=data[0:20]
# Iterating through the json
# list

nodes={'Secteurs':{'parentId':'root'},
        "Firmes":{'parentId':'root'},
        'Clients':{'parentId':'root'},
        'Cibles':{'parentId':'root'},
        'Affiliations':{'parentId':"Firmes"},
        "Domaines d'intervention":{'parentId':'root'},
        'Membre du Gouvernement ou membre de cabinet ministeriel':{'parentId':'Cibles'},
        "Directeur ou secretaire general, ou leur adjoint, ou membre du college ou d'une commission des sanctions d'une autorite administrative ou publique independante":{'parentId':'Cibles'}
        }
links=[]
unpublished=[]
pasAppart=[]
labs=[]
pasdaffil=[]
nosecteur=[]
identifiants_firmes= set()
identifiants_affiliations=set()
identifiants_clients=set()
occurs={}
#allKeys=set()
counter=0
for firme in data:
    #allKeys |= set(firme.keys())
    counter=counter+1
    #printjs(firme)
    print(counter)
    print('********')
    nom=firme['denomination']
    print(nom)
    lab=firme['categorieOrganisation']['label']
    labs+=[lab]
    print(lab)

    ident=firme['typeIdentifiantNational']+str(firme['identifiantNational'])
    identifiants_firmes.add(ident)
    print('******affiliation')


    secteurs=[]
    for a in firme['activites']['listSecteursActivites']:
        secteurs+=[a['label']]#[unicodedata.normalize('NFKD', a['label']).encode('ascii', 'ignore')]
        links+=[{'source':nom,
                    'target':a['label'],
                    'options':{'type':"Secteur d'activite"},
                    'targetParentId':'Secteurs'}]
    if secteurs==[]:
        nosecteur+=[nom]


    parent=lab
    if lab not in nodes:
        nodes[lab]={'parentId':"Firmes"}

    if len(firme['affiliations'])==1:
        parent=firme['affiliations'][0]
    elif firme['affiliations']==[]:
        print("pas d'affiliation")
        pasdaffil+=[nom]

    for a in firme['affiliations']:

        identifiants_affiliations.add(a['typeIdentifiantNational']+str(a['identifiantNational']))
        denom=a['denomination']
        links+=[{'source':nom,
                    'target':denom,
                    'targetParentId':'Affiliations', # si existe pas a la fin
                    'options':{'type':'Affiliation'}}]
        #affils+=[denom]
        if not denom in occurs:
            occurs[denom]={'total':1,'affilies':[nom],'secteurs':{}}
        else:
            occurs[denom]['total']+=1
            occurs[denom]['affilies']+=[nom]
        for s in secteurs:
            if s in occurs[denom]['secteurs']:
                occurs[denom]['secteurs'][s]+=1
            else:
                occurs[denom]['secteurs'][s]=1



    printjs(firme['affiliations'])
    print('tiers',firme['declarationTiers'])
    print('******activites')
    printjs(firme['activites']['listSecteursActivites'])
    printjs(firme['activites']['listNiveauIntervention'])
    printjs('****clients')
    printjs(firme['clients'])
    for cl in firme['clients']:
        links+=[{'source':nom, 'target':cl['denomination'],'targetParentId':'Clients','options':{'type':'Client'}}]
        identifiants_clients.add(cl['typeIdentifiantNational']+str(cl['identifiantNational']))
    print('******exercices')
    for ex in firme['exercices']:
        ex=ex['publicationCourante']
        if 'activites' in ex:
            for act in ex['activites']:
                dict=act['publicationCourante']
                printjs(dict)
                for action in dict['actionsRepresentationInteret']:
                    print('new action')
                    for cible in action['reponsablesPublics']:#sic...
                        print('new cible',cible)
                        options={'type':"Action",
                                                'Objet':dict['objet'],
                                                'Decisions concernees':action['decisionsConcernees'],
                                                'Actions menees':action['actionsMenees'],
                                                'Tiers concernes':action['tiers']
                                                }
                        if cible.startswith('Membre du Gouvernement ou membre de cabinet ministériel -'):
                            options['Ministere']=cible.split(' - ')[1]
                            cible='Membre du Gouvernement ou membre de cabinet ministeriel'
                        
                        if cible.startswith("Directeur ou secrétaire général, ou leur adjoint, ou membre du collège ou d'une commission des sanctions d'une autorité administrative ou publique indépendante -"):
                            options['Instance']=cible.split(' - ')[1]
                            print(cible)
                            cible="Directeur ou secretaire general, ou leur adjoint, ou membre du college ou d'une commission des sanctions d'une autorite administrative ou publique independante"
                        
                        
                        links+=[{'source':nom,
                                    'target':cible,
                                    'targetParentId':"Cibles",
                                    'options':options}]

    if not firme['isActivitesPubliees']:
        print('activites non publiees...')
        unpublished+=[nom]
        print('ok')

    if not firme['declarationOrgaAppartenance']:
        print('appartenance non declaree...')
        pasAppart+=[nom]
    nodes[nom]={'parentId':lab,'options':{'identifiant':firme['typeIdentifiantNational']+str(firme['identifiantNational'])}}

    #x=raw_input('press any key')
f.close()


# Closing file
print("###############activites non publiees",unpublished)

print("###############appartenance non declaree",pasAppart)
print('###############labs',collections.Counter(labs))

print("###############pas d'affil",collections.Counter(pasdaffil))
print('###############pas de secteur',nosecteur)
print('############ occurences')
printjs(occurs)



lookForAffilsSector=False
if lookForAffilsSector:
    valid_sect={}
    counter=0
    total=0
    plusQue3=0
    for o in occurs:
        total+=1
        keep=False
        groupe=occurs[o]
        sect=groupe['secteurs']
        if len(sect)==1:#il est valide s'il n'a qu'un secteur
            main_sect=sect.keys()[0]
            keep=True
        elif groupe['total']>2:#cette affil apparait 3 fois ou plus
            plusQue3+=1
            values = sorted(sect.values(),reverse=True)
            if values[0]>values[1]+1 or values[0]==groupe['total']:
                keep=True
                main_sect=[k for k,v in sect.items() if v==values[0]][0]
            print(o)
            printjs(groupe)
        if keep:
            counter+=1
            valid_sect[o]=main_sect

    printjs(valid_sect)
    print(counter,'sur',total,plusQue3)
    
print(identifiants_firmes)
print(identifiants_affiliations)

print("intersection affil",identifiants_firmes.intersection(identifiants_affiliations))
print("difference affils",identifiants_affiliations.difference(identifiants_firmes))
print('intersection clients',identifiants_firmes.intersection(identifiants_clients))
print('diff clients',identifiants_clients.difference(identifiants_firmes))
#print('all keys',allKeys)



with open("lobbys.json", "w+") as jsonFile:
        jsonFile.seek(0)
        result={"nodes":nodes,"links":links}
        json.dump(result, jsonFile, indent = 4, separators = (',', ':'))#, sort_keys=True)
        jsonFile.truncate()
