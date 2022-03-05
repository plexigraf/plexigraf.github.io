import pandas,json,collections

filename='efd_paris'
minimal_version=False
light_version=True
#filename='efd'
# Opening JSON file
non_indicated_string="-"#"non renseigné"

def printjs(s):
    json.dumps(s, indent=4, sort_keys=True, default=str,ensure_ascii=False)

df=pandas.read_json(filename+'.json').fillna(non_indicated_string)
nodes={'Entreprises':{'id':'Entreprises',
                        'parentId':'root'},
        'root':{'id':'root',
                        'name':'Catégories'}
        }
links=[]
firmes=[]
for index, row in df.iterrows():
    #print(row)
    cat=row['Catégorie Beneficiaire']
    nom=row['Structure Bénéficiaire'] if row['Nom Prénom']==non_indicated_string else row['Nom Prénom']
    ville=row['Beneficiaire Ville']
    if not nom in nodes:

        nodes[nom]={'id':nom,
                        'parentId':cat,
                        }

    if cat not in nodes:
        nodes[cat]={'id':cat,
                    'parentId':'root'}
    firme=row['Entreprise Émmetrice']
    #firmeId=row['Identifiant Entreprise']
    #nodes['firme']={'name':firme}

    firmes+=[firme]
    filiale=row["Filiale Déclarante"]
    detail={'value':row['Detail']+' - '+row['Categorie Precise']+' - '+row['Categorie Generale']}


    link={'source':nom,
            #'targetName':firme,
            'target':firme,
            'targetParentId':'Entreprises',
            }

    if not minimal_version:
        nodes[nom]['Ville']=ville
        nodes[nom]['options']={'Nom complet':{'value':nom}}#,'Also member of':ville}

        link['options']={ 'Montant':{'value':str(row['Montant Ttc'])+" €"},#{k:{'value':str(v)} for k,v in row.to_dict().items()
                    #'Détail':{'value':str(row['Date'])},
                    'Date':{'value':str(row['Date'])},
                    'ID Transparence Santé':{'value':row['Declaration ID'],'source':'Lien','url':'https://www.transparence.sante.gouv.fr/pages/accueil/'
                                                },
                    'Détail': row['Detail'] if light_version else detail
                    }
        if filiale!= non_indicated_string:
            link['options']['Filiale']=filiale

    links+=[link]

    #print(',,,,',nodes[nom])

    print(nom,'---')

params= {"hierarchyInfo": False,
            "displayFiliation": False,
            "inheritPicFromChild": False,
            "oldNodesNumber": 3,
            "description": "Ceci est une visualisation des avantages et rémunérations entre entreprises privées et membres du corps médical"}

words={"Member of": "Membre de", "Contains": "Contient", "Links": "Liens","Links with": "Liens avec","Size":'Taille'}

minStr="-minimal" if minimal_version else ""
print(collections.Counter(firmes))
with open(filename+"-grafviz"+minStr+".json", "w+") as jsonFile:
    jsonFile.seek(0)
    json.dump({'nodes':nodes
                ,'links':links,
                'params':params,
                'words':words,
                }, jsonFile, indent = 4, separators = (',', ':'), default=str, sort_keys=True,allow_nan=False)
    jsonFile.truncate()
