

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

function setUp(s){
  if (s.endsWith('Maths')){
    return {'rootName':'Linages'}
  } else if (s=='maths') {return {'rootName':'Mathematicians'}}
    else if( s.includes('taxons')){ return {'rootName':s.replace('taxons',)}}
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

    //download(result, 'json.txt', 'text/plain');
    let nodesWD={'root': {'id': 'root',
                          'name': setUp(wdKey).rootName,
                          'parentId': 'root',
                          'hasFeaturedDesc':true,
                          'options': {},
                          'noInfoDisplay':  false,//(wdKey.endsWith("aths")),
                          //'words': {'Contains' : 'Mentored'}
                        }};
    if (wdKey=='maths'){
      nodesWD['No country indicated']={'id':'No country indicated','parentId':'root','options':{},'noInfoDisplay':true}
    }
    const entries = result.results.bindings;
    console.log('DataInfo: Translating raw DB, ' + entries.length+' entries with possible duplicates');
    for (let r in entries) {

        let uri = entries[r].id.value;
        let node={id : uri.split('/').slice(-1)[0],//QXXXX
                  name:entries[r].idLabel? entries[r].idLabel.value :  id,
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
            if (title=='Itis_TSN'){
              node.options[title.replace('_',' ')].url='https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value='+entries[r][key].value
              node.options[title.replace('_',' ')].source='ITIS Website'
            }

          }
        }

        if ('parentId' in entries[r]) {
            node.parentId = entries[r].parentId.value.split('/').slice(-1)[0]//QXXXX
            //console.log(id,'parent',parentId)
        }

        node.options['Also member of']={'value':new Set()}
        if ('country' in entries[r]){
          countryId=entries[r].country.value.split('/').slice(-1)[0]
          node.options['Also member of'].value.add(countryId)
          //trick: last occurence of country prevails to get the first continent property
          continentId = entries[r].continent.value.split('/').slice(-1)[0]
                nodesWD[countryId]={
                    "id": countryId,
                    "parentId": continentId, // == "Q7377" ? "root" : parentUri,
                    "options": {},
                    "words":{'Member of':'Member of'}
                }

          if ( entries[r].countryLabel) {nodesWD[countryId].name=entries[r].countryLabel.value}

          if (!(continentId in nodesWD)) {
                nodesWD[continentId]={
                    "id": continentId,
                    "parentId": 'root', // == "Q7377" ? "root" : parentUri,
                    "options": {},
                    "words":{'Member of':'Member of'}
                }

            }
          if ( entries[r].continentLabel) {nodesWD[continentId].name=entries[r].continentLabel.value}
        } else if (wdKey=='maths'){
          node.options['Also member of'].value.add('No country indicated')
        }

        //console.log(entries[r].childLabel.value,id,entries[r].pic,entries[r].linkTo.value.split('/').slice(-1)[0]);
        //debug_print(id,entries[r],entries[r].occupation)
        //console.log(entries[r])
        node.isMath= (wdKey=='maths') || ( entries[r].occupation && (entries[r].occupation.value.split('/').slice(-1)[0]=='Q170790') )//math
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

        //if ('optionNotable_work' in entries[r]) {console.log('feat',node.feat,node,node.isMath,entries[r],Object.keys(entries[r]))}

        nodesWD[node.id]=mergeNodes(nodesWD[node.id],node)
        //console.log(r,id,nodesWD[r],isMath,entries[r],entries[r].occupation.value,entries[r].occupation.value.split('/').slice(-1)[0]=='Q1622272')
    }
    json_WD = {'params': {'cleanNonFeatured': true,
                          'inheritPicFromChild':(wdKey.includes('taxons')),
                            'simultImg':150,
                            'inheritLinks': (wdKey=='maths')?2:1,//1 node suffices to inherit link
                            'connectOtherParents':(wdKey.endsWith('aths')),
                           'biPartiteLinks': false },
                'linksWidth':{'Member of':5,'Also member of':2,'Multiple links':10},
                'nodes': nodesWD,
                'links': [],};

                console.log('nodesWD',nodesWD,nodesWD['Q41485'])
    /*if ((wdjs||load_from_WD)&&(wdKey.endsWith('aths'))){
        json_WD['words']={
            'Member of':'Mentored by',
            'Also member of':'Other mentor'
        }
    }*/
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
    if (newNode.parentId && (newNode.parentId != node.parentId)){
      node=addOptionValue(node,'Also member of',{'value':newNode.parentId})
    }
    return node
  } else {
    return newNode
  }
}

function addOptionValue(node, key, obj) { //add value to  nodes[id].options[key].info.value
    //console.log('addoption'+node.id,key,value,node)
    if (obj.value == 'root' || !(obj.value)) {
        return node
    }
    if (node.options[key]) {
        if (typeof(node.options[key].value)=='object') {//it's already a set
            obj.value=typeof(obj.value)=='object'? obj.value : new Set([obj.value])
            node.options[key].value=new Set([...node.options[key].value, ... obj.value])
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


function wdQuery(s) {
  console.log('wdquery',s)

       if (s.endsWith('Maths')){
          countryDict={'fr':'Q142','gr':'Q183','us':'Q30','uk':'Q145','rs':'Q159'}
          countryCode=countryDict[s.substring(0,2)]
          console.log(countryCode)
        return `  SELECT ?id ?idLabel ?parentId ?optionAward ?optionAwardLabel ?mgid ?optionNotable_work ?optionNotable_workLabel ?optionWikipedia_article ?occupation ?influencer (SAMPLE(?student) AS ?student) (SAMPLE(?img) AS ?img) WHERE {
                  {
                    ?id wdt:P106 wd:Q170790;
                      wdt:P27 wd:`+countryCode+`.
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
                      wdt:P27 wd:`+countryCode+`.
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
} 
    else if  (s== 'maths')
  {return `SELECT ?id ?idLabel ?country ?countryLabel ?continent  ?occupation ?parentId ?optionAward ?optionAwardLabel ?mgid ?optionNotable_work ?optionNotable_workLabel ?optionWikipedia_article ?influencer (SAMPLE(?student) AS ?student) (SAMPLE(?img) AS ?img) WHERE {
  ?id wdt:P106 wd:Q170790;
    rdfs:label ?idLabel. FILTER((LANG(?idLabel)) = "en")
  optional{ ?id wdt:P27 ?country.
      ?country  rdfs:label ?countryLabel. FILTER((LANG(?countryLabel)) = "en")
          ?country wdt:P30 ?continent.}
  OPTIONAL {
    ?optionWikipedia_article schema:about ?id;
      schema:isPartOf <https://en.wikipedia.org/>.
  }
  OPTIONAL { ?id wdt:P18 ?img. }
  OPTIONAL {
    ?id p:P800 _:b102.
    _:b102 ps:P800 ?optionNotable_work.
    ?optionNotable_work rdfs:label ?optionNotable_workLabel.
    FILTER((LANG(?optionNotable_workLabel)) = "en")
  }
  OPTIONAL {
    ?id wdt:P166 ?optionAward.
    ?optionAward rdfs:label ?optionAwardLabel.
    FILTER((LANG(?optionAwardLabel)) = "en")
  }
  OPTIONAL {
    ?id (wdt:P802|wdt:P185) ?student.
    ?student wdt:P106 wd:Q170790.
  }
  OPTIONAL {
    ?id (p:P1066|p:P184) _:b103.
    _:b103 (ps:P1066|ps:P184) ?parentId.
    ?parentId wdt:P106 wd:Q170790.
  }
  OPTIONAL { ?id wdt:P737 ?influencer. }
}
GROUP BY ?id ?idLabel ?country ?countryLabel ?continent    ?occupation ?parentId ?optionAward ?optionAwardLabel ?mgid ?optionNotable_work ?optionNotable_workLabel ?optionWikipedia_article ?influencer

`
    }
    else if (s.includes('taxons')){
      taxonDict={'mammals':'Q7377','Arachnids':'Q1358'}
      taxonCode=taxonDict[s.replace('taxons','')]
      return `
        SELECT ?id ?idLabel ?optionItis_TSN ?parentId ?optionFrench_article ?optionEnglish_article (SAMPLE(?img) as ?img)#random pic
        WHERE
        {
          ?id wdt:P171+ wd:`+taxonCode+`.  #id en dessous de mammifères
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
}
