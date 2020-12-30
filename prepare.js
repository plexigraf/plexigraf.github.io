

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let filename = urlParams.get('filename')
let load_from_WD = urlParams.get('load_from_WD')=='true'? true:false
let wdjs = urlParams.get('wdjs')=='true'? true:false
let wdKey=urlParams.get('wdKey')
if (filename == null && !load_from_WD && !wdjs){
    filename='political/Philippe-II-2018.json'
}
//document.getElementById("dbname").innerHTML=load_from_WD? 'Querying DB' : 'Processing DB '+filename;
console.log(queryString,load_from_WD,wdjs,filename)



//console.log = function() {}

setUp={
  'frMaths':{'rootName':'Lignées',
            }
            ,
  'mammals':{'rootName':'Mammals'}
}

let json_WD;

class SPARQLQueryDispatcher {
    constructor( endpoint ) {
        this.endpoint = endpoint;
    }

    query( sparqlQuery ) {
        const fullUrl = this.endpoint + '?query=' + encodeURIComponent( sparqlQuery );
        const headers = { 'Accept': 'application/sparql-results+json' };

        return fetch( fullUrl, { headers } ).then( body => body.json() );
    }
}


function treatWDDB(result) {

    console.log(JSON.stringify(result, null, 2))
    console.log('launch', load_from_WD,wdjs)

    //download(result, 'json.txt', 'text/plain');
    let nodesWD={'root': {'id': 'root',
                          'name': setUp[wdKey].rootName,
                          'parentId': 'root',
                          'hasFeaturedDesc':true,
                          'options': {},
                          'noInfoDisplay':  (wdKey=="frMaths"),
                          'words': {'Contains' : 'Mentored'}}};
    const entries = result.results.bindings;
    console.log('DataInfo: Translating raw DB, ' + entries.length+' entries with possible duplicates');
    for (let r in entries) {

        let uri = entries[r].id.value;
        let node={id : uri.split('/').slice(-1)[0],//QXXXX
                  name:entries[r].idLabel.value,
                  img : entries[r].img ? entries[r].img.value : undefined,
                  options:{'Data': {
                            "value": "WikiData",
                            "source": "WikiData",
                            "url": uri,
                            'priority':4
                          }
                        },
        }


        for (let key in entries[r]){
          if (key.startsWith('option')){
            title=key.replace('option','').replace('Label','')
            //console.log(key,entries[r][key],entries[r])
            node.options[title.replace('_',' ')]={'value':entries[r]['option'+title+'Label']?.value||entries[r][key].value,
                                      'source':'WikiData',
                                      'url':entries[r]['option'+title].value||uri,
                                      'priority':(title=='Notable_work')? 2 : 3
                                    }
          }
        }

        if ('parentId' in entries[r]) {
            node.parentId = entries[r].parentId.value.split('/').slice(-1)[0]//QXXXX
            //console.log(id,'parent',parentId)
        } else if (wdKey=='frMaths' && entries[r]['influencer'] ){
          node.parentId=entries[r].influencer.value.split('/').slice(-1)[0]
        } else if (wdKey=='maths') {//for mathematicians
            //console.log(id,entries[r],Object.keys(entries[r]),entries[r].parentId,parentId in entries[r],entries[r].parentId)
            node.words={'Member of':'Member of'}
            try {country = entries[r].countryLabel.value
            }
            catch (error){
                country=entries[r].country.value.split('/').slice(-1)[0]
                console.log(error,'nocountry',id,country)}
            //console.log(id,entries[r].idLabel.value,'orphan',country)
            try {continent = entries[r].continentLabel.value
            }
            catch (error){
                continent=entries[r].continent.value.split('/').slice(-1)[0]
                console.log(error,'nocontinent',id,continent)}
            node.parentId = country;
            if (!(country in nodesWD)) {
                nodesWD[country]={
                    "id": country,
                    "parentId": continent, // == "Q7377" ? "root" : parentUri,
                    "options": [],
                    "noInfoDisplay": true
                }

            }
            if (!(continent in nodesWD)) {
                nodesWD[continent]={
                    "id": continent,
                    "parentId": 'root', // == "Q7377" ? "root" : parentUri,
                    "params": [],
                    "noInfoDisplay": true
                }

            }
        } else {
          node.words={'Member of':'Member of'}
        }

        //console.log(entries[r].childLabel.value,id,entries[r].pic,entries[r].linkTo.value.split('/').slice(-1)[0]);
        //debug_print(id,entries[r],entries[r].occupation)
        //console.log(entries[r])
        node.isMath=  entries[r].occupation && (entries[r].occupation.value.split('/').slice(-1)[0]=='Q170790')//math
        node.feat=('optionItis_TSN' in entries[r])
                              ||
                            ('optionWikipedia_article' in entries[r]//un matheux est celebre s'il a un article WP et un Notable_work ou (un award et un student mathematician)
                                &&
                            node.isMath
                                &&
                                ('optionNotable_work' in entries[r]
                                  ||
                                ('optionAward' in entries[r]   &&  'student' in entries[r])
                              )
                            )


        nodesWD[node.id]=mergeNodes(nodesWD[node.id],node)
        //console.log(r,id,nodesWD[r],isMath,entries[r],entries[r].occupation.value,entries[r].occupation.value.split('/').slice(-1)[0]=='Q1622272')
    }
    console.log('nodesWd',nodesWD)
    json_WD = {'params': {'cleanNonFeatured': true,
                          'inheritPicFromChild':(wdKey=='mammals'),
                            'simultImg':150,
                            'inheritLinks': 1,//1 node suffices to inherit link
                            'connectOtherParents':(wdKey=='frMaths')  },
                'linksWidth':{'Member of':5,'Also member of':2,'Multiple links':10},
                'nodes': nodesWD,
                'links': [],};

                console.log('nodesWD',nodesWD,nodesWD['Q41485'])
    if ((wdjs||load_from_WD)&&(wdKey == 'maths' || wdKey=='frMaths')){
        json_WD['words']={
            'Member of':'Mentored by',
            'Also member of':'Other mentor'
        }
    }
    //if (error) throw error;
    buildNodesLinks(json_WD)


    //on calcule les liens visibles et on lance la simulation
    init(true);


}


function mergeNodes(node,newNode){
  if (node){
    for (let key in newNode.options){
      //console.log(node.options[key])
      node=addOptionValue(node,key,newNode.options[key])
    }
    node.img=node.img||newNode.img
    node.feat=node.feat||newNode.feat
    node.isMath=node.isMath||newNode.isMath
    if (newNode.parentId != node.parentId){
      node=addOptionValue(node,'Also member of',{'value':newNode.parentId})
    }
    return node
  } else {
    return newNode
  }
}

function addOptionValue(node, key, obj) { //add value to  nodes[id].options[key].info.value
    //console.log('addoption'+node.id,key,value,node)
    if (obj.value == 'root') {
        return node
    }
    if (node.options[key]) {
        if (node.options[key].value.size) {//it's already a set
            node.options[key].value.add(obj.value)
        } else if (obj.value!=node.options[key].value) {//create new set with 2 elements
            value=new Set([node.options[key].value, obj.value])//lose obj properties
            node.options[key].value=value
        }
    } else {
        node.options[key] = obj
    }
    return node
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}


let wdQuery={

        'idealMathsQuery':`
            select ?id ?idLabel ?parentId  ?country ?countryLabel  ?continent ?continentLabel  ?achievement ?achievementLabel  ?Wikipedia_article (SAMPLE(?student) as ?student) (SAMPLE(?img) as ?img)
        where {
                ?id wdt:P106 wd:Q170790.#subject is mathematician
                ?id wdt:P549 ?mathGen.#is in MG database
            {
                select ?id ?parentId   ?country ?countryLabel   ?continent ?continentLabel ?achievement ?Wikipedia_article ?student  ?img where {

                    OPTIONAL{ ?Wikipedia_article schema:about ?id;   schema:isPartOf <https://en.wikipedia.org/>.}#has EN WP page
                    ?id wdt:P27 ?country .
                {
                    select ?id ?country  ?continent where {
                        ?country  wdt:P30 ?continent.

                }
            }

                OPTIONAL { ?id wdt:P18 ?img. }
                OPTIONAL{ ?id wdt:P800|wdt:P166 ?achievement.}
                OPTIONAL {?id wdt:P802|wdt:P184 ?student.
                ?id wdt:P106 wd:Q170790.}#has student mathematician
                OPTIONAL {  ?id (wdt:P1066|wdt:P184) ?parentId.#has advisor mathematician who also has entry in MG
                ?parentId wdt:P106 wd:Q170790.
                ?parentId wdt:P549 ?parentMathGen.
            }

                SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
            }
            }
                #?id rdfs:label ?idLabel. FILTER( LANG(?idLabel)="en" )
                SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
            }
            GROUP BY ?id ?idLabel ?parentId  ?country ?countryLabel   ?continent ?continentLabel ?achievement  ?achievementLabel  ?Wikipedia_article
                `
        ,







                'frMaths':`

                SELECT ?id ?idLabel ?parentId ?optionAward ?optionAwardLabel ?mgid ?optionNotable_work ?optionNotable_workLabel ?optionWikipedia_article ?occupation ?influencer (SAMPLE(?student) AS ?student) (SAMPLE(?img) AS ?img) WHERE {
                  {
                    ?id wdt:P106 wd:Q170790;
                      wdt:P27 wd:Q142.
                    VALUES ?occupation {
                      wd:Q170790
                    }
                    OPTIONAL {
                      ?optionWikipedia_article schema:about ?id;
                        schema:isPartOf <https://en.wikipedia.org/>.
                    }
                    OPTIONAL { ?id wdt:P18 ?img. }
                    OPTIONAL {
                      ?id p:P800 _:b102.
                      _:b102 ps:P800 ?optionNotable_work.
                    }
                    OPTIONAL { ?id wdt:P166 ?optionAward. }
                    OPTIONAL {
                      ?id (wdt:P802|wdt:P185) ?student.
                      ?student wdt:P106 wd:Q170790.
                    }
                  }
                  UNION
                  {
                    ?id wdt:P549 ?mgid;
                      wdt:P27 wd:Q142.
                  }
                  OPTIONAL {
                    ?id (p:P1066|p:P184) _:b103.
                    _:b103 (ps:P1066|ps:P184) ?parentId.
                    ?parentId wdt:P106 wd:Q170790.
                  }
                  OPTIONAL {
                    ?id wdt:P737 ?influencer
                    }

                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
                GROUP BY ?id ?idLabel ?occupation ?parentId ?optionAward ?optionAwardLabel ?mgid ?optionNotable_work ?optionNotable_workLabel ?optionWikipedia_article ?influencer
  `
        ,
        'mammals':`
        SELECT ?id ?idLabel ?optionItis_TSN ?parentId ?optionFrench_article ?optionEnglish_article (SAMPLE(?img) as ?img)#random pic
        WHERE
        {
          ?id wdt:P171+ wd:Q7377.  #id en dessous de mammifères
          OPTIONAL{?id wdt:P815 ?optionItis_TSN}
          OPTIONAL { ?id wdt:P171 ?parentId.}
                   #too slow ?parent wdt:P171* wd:Q7377.}#lien de filiation a un parent lui meme descendant de mammifères
          OPTIONAL { ?id wdt:P18 ?img }#on prend une image

          OPTIONAL{   ?optionEnglish_article schema:about ?id .
                    ?optionEnglish_article schema:isPartOf <https://en.wikipedia.org/>}
          OPTIONAL{   ?optionFrench_article schema:about ?id .
                    ?optionFrench_article schema:isPartOf <https://fr.wikipedia.org/>}
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }#en anglais
        }
        GROUP BY ?id ?idLabel ?optionItis_TSN ?optionEnglish_article ?optionFrench_article ?parentId #pour results qui ont la meme image
        `
}
