# GRAFVIZ

GRAFVIZ est un outil de visualisation et d'exploration où les données sont des entités / individus ayant des liens de diverses natures, et notamment des liens hiérarchiques / de filiation. 

## Installation

Il suffit de préparer un fichier de données "data.json" comme indiqué ci-dessous dans le répertoire où se situe index.html, et d'ouvrir l'URL
"https://grafviz.github.io/graph-v3.html?filename=data.json" pour accéder à la visualisation.

## Fichiers de données

Tout fichier de données est sous forme json et contient:
 - Un champ "nodes", contenant la liste des entités, chacune ayant un identifiant unique "id", 
 et l'identifiant d'un parent via le champ "parentID", qui l'insèrent dans la structure globale. 
 Il y a également beaucoup de champs optionnels, comme "name", "img", "options", ... détaillés plus tard.
 - Un champ "links", contenant les liens non-hiérarchiques qui relieront les individus entre eux. 
 Chaque lien a une "source" et une "target", désignant les deux entités reliées par ce lien. Voilà un exemple minimal:

``` 
{
    "nodes":[
        {
            "id":"id1",
            "name":name1
        },
        {
            "id":"id2",
            "name":"name2"
         }],
    "links":[
        {
            "source": "id1",
            "target": "id2"
        }]
}
``` 

## Champs optionnels

L'intêret de la visualisation réside essentiellement dans les champs optionnels que l'on peut indiquer, en voici certains:

### Champs optionnels du fichier de données

- On peut mettre un champ "params", pour modifier certains paramètres par défaut, par exemple 
- - "screenRatio", qui détermine le rapport entre hauteur et 
largeur de la fenêtre de visualisation
-- "hierarchyInfo", qui détermine s'il faut afficher pour chaque noeud les informations relatives à la structure hierarchique (nombre de descendants, 
indice de couche, etc...)
-- Et bien d'autres, il faut aller voir dans "grafviz.json" pour le détail.
- Un fichier "words" peut indiquer des traducations éventuelles pour des termes présent par défaut dans la visualisation.
- La structure repose sur un individu "root" qui est le parent hiérarchique de tous les autres individus, et a le nom "root", il est créé par 
défaut lorsque la visualisation est chargée. Il est possible de modifier les paramètres de cet individu en l'indiquant explicitement dans la liste
"nodes", en ajoutant par exemple l'entrée 
```
{"id":"root",
  "name":"Catégories"}
  ```
  Ce noeud n'a par définition pas de parent.

### Champs optionnels des individus

En plus des champs obligatoires "id" et "parentId", de nombreux champs sont possibles, par exemple 
- "name" si "id" n'est pas un nom approprié, ou "firstName" et "lastName"
- "img" (sous forme d'une URL)
- "options", qui contient lui-même des informations qui seront affichées lorsque l'on sélectionne l'individu. Chaque entrée d'option est de la forme
```
"nom de l'option": {"value": "valeur de l'option", 
                    "sourve": "source de l'information (optionnel)",
                    "url": "adresse (optionnel)}
```
- "options" peut notamment contenir le champ "Also member of", qui indique un parent secondaire de l'individu.
- Les liens éventuels de l'individu avec d'autres individus sont normalement indiqués dans l'entrée "links", mais il est possible de les indiquer directement
- ici, via une liste "links".


TODO:

### Champs optionnels des liens

### Autres paramètres

### WikiData
