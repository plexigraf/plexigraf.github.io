import pandas,json,collections

#filename='base_efd_gap_sample'
filename='base_efd_gap'
# Opening JSON file


def printjs(s):
    json.dumps(s, indent=4, sort_keys=True, default=str,ensure_ascii=False)

df=pandas.read_json(filename+'.json').fillna("non renseigné")
nodes={'Entreprises':{'id':'Entreprises',
                        'parentId':'root'},
                        'id':'root',
                        'name':'Catégories'}
links=[]
firmes=[]
for index, row in df.iterrows():
    print(row)
    cat=row['Catégorie Beneficiaire']
    nom=row['Nom Prénom'] if cat=='Professionnel de santé' else row['Structure Bénéficiaire']
    ville=row['Beneficiaire Ville']
    if not nom in nodes:
        nodes[nom]={'id':nom,
                        'Ville':ville,
                        'parentId':cat,
                        #'options':{'Also member of':ville}
                        }
    if cat not in nodes:
        nodes[cat]={'id':cat,
                    'parentId':'root'}
    firme=row['Entreprise Émmetrice']
    #firmeId=row['Identifiant Entreprise']
    #nodes['firme']={'name':firme}

    firmes+=[firme]

    link={'source':nom,
            'targetName':firme,
            'target':firme,
            'targetParentId':'Entreprises',
            'options':{k:{'value':str(v)} for k,v in row.to_dict().items()}
            }
    links+=[link]

    print(',,,,',nodes[nom])

    print('---')
print(collections.Counter(firmes))
with open(filename+"-grafviz.json", "w+") as jsonFile:
    jsonFile.seek(0)
    json.dump({'nodes':nodes
                ,'links':links,
                'params':{}
                }, jsonFile, indent = 4, separators = (',', ':'), default=str, sort_keys=True,allow_nan=False)
    jsonFile.truncate()
