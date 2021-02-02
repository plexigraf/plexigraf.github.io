import pandas as pd
import glom
import json

df=pd.read_csv('Castex.tsv', sep='\t')

print(df)


nodes_dict={}
links=[]


def printjs(s):
    print(json.dumps(s, indent=4, sort_keys=True))

currentId=""
for i,row in df.iterrows():
	if row['firstName']=='Nom':
		continue
	print('----',row,row.keys())
	node={}
	for key in row.keys():
		chain=key.split('/')
		value=row[key]
		if pd.isna(value):
			continue
		path=[]
		for k in chain:
			path+=[k]
			try:
				print('***',glom.glom( node,'.'.join(path) ))
			except KeyError:
				glom.assign( node,'.'.join(path),{})
		glom.assign(node,'.'.join(chain),value)
	printjs(node)
	if not (pd.isna(row['firstName'])):
		print(row['firstName'],'last name',row['lastName'])
		if pd.isna(row['lastName']) or row['lastName']=='':
			print('no')
			node['lastName']=''
			node['name']=node['firstName']
		else:
			print('yes')
			node['name']=node['firstName']+' '+node['lastName']
		node['id']='root' if node['name']=='France' else node['name']
		nodes_dict[node['id']]=node
		currentId=node['id']
	
	if ('link' in node.keys()) and ('target' in node['link'].keys()):
		node['link']['source']=currentId
		print(node['link'])
		links.append(node['link'])

	
with open('castex.json','w') as file:
	json.dump({'nodes':nodes_dict,
				'links':links,
				'words':{'Member of':'Membre de',
							'Contains':'Contient',
							'Links':'Liens'},
				'params':{'hierarchyInfo':False,
							'displayFiliation':False,
							'inheritPicFromChild':False,
							'initialFocus':"Ministres",
							'oldNodesNumber':10,
							'description': "Ceci est une visualisation des liens entres les membres actuels du gouvernement et d'autres entités privées ou publiques"}}
			,file)