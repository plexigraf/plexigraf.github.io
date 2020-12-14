let wdQuery={}

idealMathsQuery=`
    select ?id ?idLabel ?parentId  ?country ?countryLabel  ?continent ?continentLabel  ?achievement ?achievementLabel  ?enArticle (SAMPLE(?student) as ?student) (SAMPLE(?pic) as ?pic)
where {
        ?id wdt:P106 wd:Q170790.#subject is mathematician
        ?id wdt:P549 ?mathGen.#is in MG database
    {
        select ?id ?parentId   ?country ?countryLabel   ?continent ?continentLabel ?achievement ?enArticle ?student  ?pic where {

            OPTIONAL{ ?enArticle schema:about ?id;   schema:isPartOf <https://en.wikipedia.org/>.}#has EN WP page
            ?id wdt:P27 ?country .
        {
            select ?id ?country  ?continent where {
                ?country  wdt:P30 ?continent.

        }
    }

        OPTIONAL { ?id wdt:P18 ?pic. }
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
    GROUP BY ?id ?idLabel ?parentId  ?country ?countryLabel   ?continent ?continentLabel ?achievement  ?achievementLabel  ?enArticle
        `

wdQuery['maths']=`
select ?id ?idLabel ?parentId  ?country ?countryLabel  ?continent ?continentLabel  ?achievement ?achievementLabel  ?enArticle (SAMPLE(?student) as ?student) (SAMPLE(?pic) as ?pic)
where {
   ?id wdt:P106 wd:Q170790.
  {
    select ?id ?parentId   ?country ?countryLabel   ?continent ?continentLabel ?achievement ?enArticle ?student  ?pic where {
      
       ?id wdt:P27 ?country .
      {
        select ?id ?country  ?continent where {
          ?country  wdt:P30 ?continent.
        }
        }
      
      OPTIONAL { ?id wdt:P18 ?pic. }
       OPTIONAL{ ?id wdt:P800|wdt:P166 ?achievement.}
       OPTIONAL {?id wdt:P802|wdt:P184 ?student.
                ?id wdt:P106 wd:Q170790.}
      { ?enArticle schema:about ?id;
                schema:isPartOf <https://en.wikipedia.org/>.}
       OPTIONAL {  ?id (wdt:P1066|wdt:P184) ?parentId.
                    ?parentId wdt:P106 wd:Q170790.
                  #?parentId (wdt:P800|wdt:P166) ?parentAchievement.
                }
          
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?id ?idLabel ?parentId  ?country ?countryLabel   ?continent ?continentLabel ?achievement  ?achievementLabel  ?enArticle

`

wdQuery['mammals']=`
SELECT ?id ?idLabel ?parent ?frArticle ?enArticle (SAMPLE(?pic) as ?pic)#random pic
WHERE
{
  ?id wdt:P171* wd:Q7377.  #id en dessous de mammifères 
  OPTIONAL { ?id wdt:P171 ?parent.}
           #too slow ?parent wdt:P171* wd:Q7377.}#lien de filiation a un parent lui meme descendant de mammifères
  OPTIONAL { ?id wdt:P18 ?pic }#on prend une image
  
  OPTIONAL{   ?enArticle schema:about ?id .
            ?enArticle schema:isPartOf <https://en.wikipedia.org/>}
  OPTIONAL{   ?frArticle schema:about ?id .
            ?frArticle schema:isPartOf <https://fr.wikipedia.org/>}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }#en anglais
}
GROUP BY ?id ?idLabel ?enArticle ?frArticle ?parent #pour results qui ont la meme image`




//Data instructions
//params:
// key,value (voir plus bas), priorisent sur les valeurs par défaut

//nodes:
// avec id, parentId, name de préférence (mettre id en défaut)
//optionnel:img, params (dict de la forme 'titre':{'texte':'bla','source':'wikipedia','url':'www'})
//obligatoire: un noeud id:'root'
//les noeuds qui ne descendent pas de root seront ignorés
//si un noeud apparait plusieurs fois avec plusieurs parents, ils seront fusionnés
//on garde le parent descendant de root, ou le parent le plus bas hierarchiquement, arbitraire si égalité

//
//links:

//"source" : "",
//       "targetName" : "",
//       "target" : "",obligatoire
//       "targetParentId" : "",obligatoire si target n'existe pas encore, il sera créé comme feuille
//(pb si 2 du meme nom comme ca?)
//       "otherParents" : "",
//       "params" :
//

//TO DO
//calcule pas bien depth?
//Zoom ok, l'idéal serait de le calculer une fois que la dynamique s'est un peu stabilisée (attendre 1 seconde)
//quand un noeud est déployé d'un coup, le faire en plusieurs petites étapes, c'est joli
//et ça empêche aux liens de s'emmêler
//idealement il  faudrait enlever les keys du json pour la recherche
//mettre image dans rond

//faire une priorité d'affichage sur les node.params, mettre langage

//TO DO quand on clique sur une feuille, il faudrait qu'elle se rentre, et enlever l'info
// sur le graphe (mais on devrait pouvoir le faire dans les infos)
//implementer 'visibleDescendants'?

//idees taxo:
//force pas trs bien centrée...
//ne pas refaire le zoom a chaque fois
//faire un zoom sur le focus qui ignore le reste
//faire dependre linkwidth de la taille, ou autre...
//pour les positions initiales, faire dans l'ordre ascendant pour pas être trop le bordel



//dans l'info:
//possibilité de fermer un hull/noeud depuis l'info
//chaque nom, noeud, etc...rencontré dans les infos doit être cliquable
//rajouter filiation dans les infos
//possibilité de naviger dans les infos des briques, sous briques etc...


//1e partie: WD


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

if (load_from_WD) {
    const endpointUrl = 'https://query.wikidata.org/sparql';
    const sparqlQuery = wdQuery[wdKey];
    console.log('querying...')
    const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
    queryDispatcher.query(sparqlQuery).then(launch);
}

if (wdjs){
    console.log('wdjs')
    $.getJSON("maths/"+wdKey+".json", launch)
}

function launch(result) {
    console.log(JSON.stringify(result, null, 2))
    console.log('launch', load_from_WD,wdjs)

    const nodesWD = [{'id': 'root', 'name': 'Pays', 'parentId': 'root', 'hasFeaturedDesc':true, 'params': {}}];
    const entries = result.results.bindings;
    console.log(result, result.results, result.results.bindings, result.results.bindings[0])
    for (let r in entries) {
        let uri = entries[r].id.value;
        let id = uri.split('/').slice(-1)[0];
        let parentId;
        if ('parentId' in entries[r]) {
            parentId = entries[r].parentId.value.split('/').slice(-1)[0]
            //console.log(id,'parent',parentId)

        } else {
            //console.log(id,entries[r],Object.keys(entries[r]),entries[r].parentId,parentId in entries[r],entries[r].parentId)
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
            parentId = country;
            if (!(country in nodesWD)) {
                nodesWD.push({
                    "id": country,
                    "parentId": continent, // == "Q7377" ? "root" : parentUri,
                    "params": []
                })

            }
            if (!(continent in nodesWD)) {
                nodesWD.push({
                    "id": continent,
                    "parentId": 'root', // == "Q7377" ? "root" : parentUri,
                    "params": []
                })

            }
        }
        let entryParams = {
            "WikiData": {
                "texte": "Wikidata",
                "source": "WikiData",
                "url": uri
            },
        }
        let achievementLabel;
        if ('achievement' in entries[r]){
            //console.log(entries[r])
            //achievementLabel=entries[r].achievementLabel.value;
            entryParams['Achievement']={
                "texte": entries[r].achievement.value.split('/').slice(-1)[0],
                "source": 'WikiData',
                "url": uri
            }
        }
        let img = entries[r].pic ? entries[r].pic.value : undefined;
        if (entries[r].frArticle) {
            entryParams['Wikipedia FR'] = {'texte': 'lien', 'url': entries[r].frArticle.value}
        }
        if (entries[r].enArticle) {
            entryParams['Wikipedia EN'] = {'texte': 'lien', 'url': entries[r].enArticle.value}
        }
        let name=entries[r].idLabel.value;
        //console.log(entries[r].childLabel.value,id,entries[r].pic,entries[r].linkTo.value.split('/').slice(-1)[0]);
        id=uri.split("/").slice(-1)[0]
        nodesWD[id]={
            "id": id,
            "name": name,
            "hasFeaturedDesc": ('achievement' in entries[r]) && ('student' in entries[r]),
            "img": img,
            "parentId": parentId, // == "Q7377" ? "root" : parentUri,
            "otherParents": [],
            "params": entryParams
        }
        console.log(id,entries[r], ('achievement' in entries[r]),('student' in entries[r]),nodesWD[id])
    }
    json_WD = {'params': {'belongsToLinkWidth': 10,
                            'cleanNonFeatured': true,
                            'simultImg':0
                                },
                'nodes': nodesWD,
                'links': {}};
    //if (error) throw error;
    buildNodesLinks(json_WD)


    //on calcule les liens visibles et on lance la simulation
    init(true);


}

//2e partie: paramètres globaux

const chartDiv = document.getElementById("mainchart");

let params = {
        belongsToLinkWidth: 1,
        screenRatio: 4 / 5,
        zoomFactor: 2,//plus c'est petit plus le graphe apparaitra grand
        dr: 44, // default point radius
        alwaysShowParent: true,// dès qu'un noeud sort tous ses ancetres également
        initialFocus: 'root',
        expand_first_n_gens: 2,
        hierarchyInfo: true,
        simultImg: 150,//max number img to display
        imgHeights: 100,
        inheritPicFromChild: true,
        cleanNonFeatured: false,
        //initialFocus;undef by default
    },
//const filename = "taxo-graph.json"
    focus,
    divName = "body",
    width = params.screenRatio * window.screen.width, // svg width
    height = width, // svg height
    largeWidth = true,//chartDiv.offsetWidth > 600,//permet d'afficher les infos
    off = params.dr;
//liste de toutes entrées de la DB, ce sera également les noeuds du graphe?
let nodes = [];
//tous les liens de la DB, y compris parenté, remplacé par metaLinks pour le tracé
let links = [];
//liste des infos à afficher, de la forme {key:value}
let infos = [];
let infoWidth = 0;//varie en fonction de info/removeInfos
let infoTextSize = 14;
let oldFocusX=0;
let oldFocusY=0;
let oldNodesNumber=2.5;
let scaleFactor=1;
//variable contenant nodes et links utilisé par D3 pour tracer
let maxGen = 0;
let net;
let force, link, linkp, node, nodec, focusedNode, focusX,focusY;

const curve = d3.svg.line()
    .interpolate("cardinal-closed")
    .tension(.85)


//document.getElementById("focus_p").innerHTML = focus

const fill = d3.scale.category20();
// --------------------------------------------------------

let idx = 'idx undef yet';


//3eme partie: on fait l'index pour la recherche
//$.getJSON(filename, function(json) {
function makeIndex(entries) {
    console.log('entries',entries)
    idx = lunr(function () {
        console.log('in',entries)
        this.ref('id')
        this.field('name',
            {boost: 10}
        )
        this.field('strParams')

        for (id in entries){
            //idealement il  faudrait enlever les keys du json
            entries[id].strParams = JSON.stringify(entries[id].params).replace(/[^0-9a-z]/gi, ' ')
            this.add(entries[id])
        }//, this)
    })

    console.log('idx done', idx)

    /*results = idx.search("truc")
    console.log('truc results', results)
    var resultdiv = $('#search-results');
    for (var item in results) {
        var ref = results[item].ref;
        var searchitem = '<li class="result">' + ref + '</li>';
        resultdiv.append(searchitem);
    }*/
}

//})


//on lance la simu
// --------------------------------------------------------

const body = d3.select(divName);

//html structure:canvas - [ infog, zoomCanvas [ vis [ nodeg, linkg, hullg ]]]
const canvas = body.append("svg").attr("id", "canvas")
        .style("border", "1px solid #ccc")
        .attr("width", width)
        .attr("height", height),
    zoomCanvas = canvas.append("svg").attr("width", width).attr("id", "zoomCanvas")
        .attr("height", height);

//necessaire pr zoom
zoomCanvas.append("rect")
    .attr("width", width)
    .attr("height", height).attr("opacity", .1);

//html structure:canvas - [ infog, zoomCanvas [ vis [ nodeg, linkg, hullg ]]]
const vis = zoomCanvas.append("g").attr("id", "vis");

//html structure:canvas - [ infog, zoomCanvas [ vis [ nodeg, linkg, hullg ]]]
let hullg = vis.append("g").attr("id", "hullg"), //env. convexes
    linkg = vis.append("g").attr("id", "linkg"), //liens
    nodeg = vis.append("g").attr("id", "nodeg"); //nodeuds
//infoG est une selection D3, infog est un element html
let infoG = canvas.append("g")
        .attr("id", "infog").attr("display", largeWidth ? "block" : "none"), //infos
    infog = document.getElementById("infog") //automatic?
//zoom ability
const zoom = d3.behavior.zoom()
    .scaleExtent([.1, 10])
    .scale(1)
    .on("zoom", zoomed);


zoomCanvas.on("mouseover", function () {
    d3.select(this).style("cursor", "move")
})
    //.on("click", removeInfos)
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.event);


//info text when cursor is over convex hull
//crsrText = vis.append("text").attr("id","crsrtxt");


function zoomed() {
    /*prevTgt=msTgt;
    msTgt="root"//d3.event.sourceEvent.target.id||"root";
    if (msTgt==="canv" && prevTgt==="canv") {*/
    vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + (d3.event.scale) + ")")
    //infoG.attr("transform", "translate(0,"+d3.event.translate[0]+")")
}

function adaptZoom() {
    //calcul du nouveau zoom basé sur le nb de noeuds.
    newNodesNumber=net.nodes.length
    scaleFactor =  zoom.scale()*Math.sqrt(oldNodesNumber/newNodesNumber)//(width - 100) / (200 * (infoWidth / 150 + Math.sqrt(net.nodes.length) + 1)) / params.zoomFactor
    focusX=nodes[focus].x || 0
    focusY=nodes[focus].y || 0
    console.log('adapt',oldNodesNumber,newNodesNumber,scaleFactor)
    //console.log('scale',scaleFactor,focusX,focusY,oldFocusX,oldFocusY)
    //on recale le canvas a gauche du texte, le graphe est censé translater tout seul via une force spécifique
    vis.transition()
        //.duration(2000)
        .call(zoom
            .scale(scaleFactor)
            .translate([width/2-focusX*scaleFactor,width/4-focusY*scaleFactor])// width/2-(  nodes[focus].x)*scaleFactor, 200-(  nodes[focus].y)*scaleFactor])
            //.translate([width/2-focusX*scaleFactor,width/4-focusY*scaleFactor])// width/2-(  nodes[focus].x)*scaleFactor, 200-(  nodes[focus].y)*scaleFactor])
            .event);
    oldNodesNumber=newNodesNumber
}

/*
function stopped() {
    if (d3.event.defaultPrevented) d3.event.stopPropagation();
}*/

/*function dragstarted(d) {
  a=bb
  d3.event.sourceEvent.stopPropagation();
  d3.select(this).classed("dragging", true);
}

function dragged(d) {
  d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}

function dragended(d) {
  d3.select(this).classed("dragging", false);
}*/

//return node.firstName + " " + node.lastName;




//construit nodes et links à partir de données json
function buildNodesLinks(data) {

    //console.log(json_WD,json_WD['root'])
    //if (load_from_WD){data = json_WD;}


    document.getElementById("dbname").innerHTML = 'Processing DB ' + filename;
    //priorité aux params du fichier:
    const keys = Object.keys(data.params)
    for (let k in keys) {
        params[keys[k]] = data.params[keys[k]]
    }
    console.log('data', data)

    //empty children linked links, initial x y random, deployedInfos prevshow=false
    function initialise(n) {
        n.name=n.name||n.id
        names=n.name.split(' ')
        n.firstName=n.firstName || names.shift()
        n.lastName=n.lastName|| names.join(' ')
        n.children = [];
        n.x = 100 + width * Math.random();
        n.y = 300 * Math.random();
        n.px = n.x
        n.py = n.y;
        n.radius = params.dr;
        n.prevShow = false;
        n.linked = [];
        n.links = [];
        n.deployedInfos = false;//détermine si l'info est déployée (non par défaut)
        n.visibleParentId = "root"//nodes.length;
        n.expanded = n.expanded || false;//pas développé par défaut
        n.isLeave = false//feuilles de l'arbre = pas d'enfant
        n.visibleDepth = 0
        n.descendants=0
        n.depth=0
        n.depthGuy=''
        n.hasFeaturedDesc=n.hasFeaturedDesc||false
        return n;
    }

    //extract nodes
    //TO do: start from root, include nodes iteratively
    //if a node has a child already registered as child of another parent,
    //younger link is privileged. Detect if node is self descendant?
    //nodes that are not descendants of roots will be ignored
    //

    let dataMap={}//id->node, temporary
    let dataChildren={}//id->list of children,temp?
    for (let i in data.nodes) {
        let n=data.nodes[i]
        if (n.id != 'root') {//sinon bcle infinie
            if (n.parentId in dataChildren) {
                dataChildren[n.parentId].push(n.id)
            } else {
                dataChildren[n.parentId] = [n.id]
            }
        }//le noeud a eventuellement plusieurs parents, on fera le choix après
        if (!(n.id in dataMap)){//ce noeud existe pas encore
            //dataMap[n.id].otherParents.push(n.parentId)
            dataMap[n.id] = n//c'est la premiere occurence du noeud qui est retenue (sauf pour parentId)


        }
        //dataChildren[n.parentId]=dataChildren[n.parentId]?dataChildren[n.parentId]+[n.id]: [n.id]
    }

    console.log(dataMap,Object.keys(dataMap),dataChildren,Object.keys(dataChildren))

    //checker si il n'y a pas des noeuds a créer via des target de liens
    //déplacer?
    for (let i in data.links){
        let l=data.links[i];
        if (dataMap[l.target]){
            //tout va bien, target existe
        } else {
            dataMap[l.target] =   {
                id: l.target,
                //il peut y avoir plusieurs last names
                name: l.targetName,
                parentId: l.targetParentId,
                expanded: false,
                params: {}
            }
            try {
                dataChildren[l.targetParentId].push(l.target)
            } catch (err) {
                dataChildren[l.targetParentId]=[l.target]
            }
        }
    }

    let crtGen=0;
    let pendingParents=new Set()
    function createDesc(p,id){
        if (id in nodes){//noeud existe deja comme enfant de qqn d'autre
            //test si le nouveau parent a une generation plus basse
            if (crtGen>nodes[id].generation){//on va plutot le mettre ici
                nodes[id].parentId=p
                nodes[id].generation=crtGen
                console.log('change',id,p)
            }else{
                return
            }
        } else {
            //console.log('add',id,'parent',p)
            let n = initialise(dataMap[id])
            n.parentId=p
            n.generation = crtGen;
            nodes[n.id]=n
        }
        let kids = dataChildren[id] || []
        crtGen++;
        pendingParents.add(id)
        for (let c = 0; c < kids.length; c++) {
            kidId=kids[c]
            if (pendingParents.has(kidId) ){
                dataChildren[id].splice(c, 1)
                window.alert('error')
                console.log('then', kidId,id,'own descendant, removed',dataChildren[id])
                continue//skip this one
            }
            try{
                createDesc(id, kidId)
            } catch(error){
                console.log(id,kidId,error)
            }
            /*if (n.img == undefined){
                n.img=nodes[kids[c]].img
            }*/
        }
        pendingParents.delete(id)
        crtGen--;
        //nodes[id].descendants=n.descendants//ne semble pas marcher avec le rayon
        //return n.descendants

    }

    createDesc("root","root")
    //console.log(x,'au total')


    makeIndex(nodes)//pour la fonction de recherche

    focus = params.initialFocus//nodes[1].id
    console.log("focus", focus)


    /*if (createOrphans) {
        nodesMap['orphans'] = nodes.length; //0 au début, grandit au fur et à mesure
        orph = initialise({'id': 'orphans', 'parentId': 'root', 'expanded': false, 'name': 'Orphans', 'params':[]}) //initialise pour l'affichage
        nodes.push(orph)

        links.push({
            source: 'orphans',
            target: 'root',
            params: {
                'type': "belongsTo"
            }

        });
    }*/


    console.log(nodes,links)
    nodes['root'].expanded = true;


    //build children lists and links
    for (let i in nodes) {
        let nodei = nodes[i];
        parent = nodes[nodei.parentId]
        nodei.show = parent.expanded;
        nodei.params['Membre de']={'texte':nodes[nodei.parentId].name||nodei.parentId}
        if (i!="root") {parent.children.push(nodei);}
    }



    console.log('computeDesc',nodes)
    //on peut desormais calculer depth et descendants
    total=computeDesc("root")

    function computeDesc(id){
        let n=nodes[id]
        let max=0,guy=null,img=n.img, desc=0, hasFeaturedDesc=n.hasFeaturedDesc;
        for (let c in n.children){
            let [kidDesc,dp,g,descImg,kidHasFD]=computeDesc(n.children[c].id)
            if (dp>max){
                max=dp
                guy=n.children[c].name
            }
            if (img==null && params.inheritPicFromChild && id!='root'){
                nodes[id].inheritedPic=true
                img=descImg
            }
            desc+=kidDesc
            hasFeaturedDesc=hasFeaturedDesc||kidHasFD

        }
        nodes[id].hasFeaturedDesc=hasFeaturedDesc
        nodes[id].descendants = desc
        nodes[id].depth = max
        nodes[id].depthGuy = guy
        nodes[id].img = img

        return [1 + desc,max+1,guy,img,hasFeaturedDesc]

    }
    console.log(total,"total")


    for (let i in nodes) {
        //on ajoute les liens de parenté
        links.push({
            source: i,
            target: nodes[i].parentId,
            params: {
                'type': "belongsTo"
            }

        });
    }
    //extract links
    for (let i in data.links) {
        //il y a des checks a faire ici...
        let linki = data.links[i] || {target: ""};
        //target required
        if (linki.target != "") {
            links.push(linki)
            //on verifie que parent existe, ou target Parent
            if (linki.target in nodes) {
            }
             else {
                console.log(i,"target inconnu", linki.parentId);
                let a = bb;
            }

            //pour chaque noeud on a la liste "linked", qui contient les noeuds avec lesquels il est lié, et une liste "links", qui contient les liens eux-mêmes
            nodes[linki.source].linked.push(nodes[linki.target]);
            nodes[linki.target].linked.push(nodes[linki.source]);
            nodes[linki.source].links.push(linki);
            nodes[linki.target].links.push(linki);
        }
    }

    //on calcule la taille de chacun, y compris noeuds nouvellement créés

    for (let i in nodes) {
        //nodes[i].descendants = size(nodes[i]) - 1
        nodes[i].radius = params.dr + Math.sqrt(nodes[i].descendants)
        //[nodes[i].depth,nodes[i].depthGuy] = depth(nodes[i])
        nodes[i].isLeave = (nodes[i].children.length == 0)//feuille de l'arbre = pas d'enfants
        if (params.hierarchyInfo) {
            nodes[i].params['Layer'] = {'texte': nodes[i].generation.toString()};
            nodes[i].params['Descendants'] = {'texte': nodes[i].descendants.toString()};
            nodes[i].params['Profondeur'] = {'texte': nodes[i].depth.toString()+(" ("+nodes[i].depthGuy+")"||"")};
        }
    }

    document.getElementById("processing").innerHTML = "";

}

if (!load_from_WD && !wdjs)  {
//lance la simu
    d3.json(filename, function (error, json) {
        //if (error) throw error;
        buildNodesLinks(json)

        //on calcule les liens visibles et on lance la simulation
        init(true);

        //effet "apparition progressive"
        /*vis.attr("opacity", 1e-6)
            .transition()
            .duration(3000)
            .attr("opacity", 1);*///empêche le zoom initial... :(


    });
}


function handleClick(event) { //pour la fctn de recherche

    let term = document.getElementById("myVal").value;
    console.log('go', term)
    normTerm=term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    let results = idx.search(term+'~1');
    console.log('done')
    console.log("results", results);
    removeInfos();
    if (results.length > 0) {
        focus = results[0].ref;
        results.push('useless')
        for (let i = 0; i < results.length - 1; i++) {
            console.log("result", i, results[i])
            infos.push(nodes[results[i].ref])
        }
        //infos.push(nodeById(results[1].ref))
        //infos = [,nodeById(results[0].ref)];
        console.log("search", infos)
        //document.getElementById("focus_p").innerHTML = focus;
        init(false);
    } else {
        console.log('no results')
        infos = [{'texte': 'Pas de résultats', 'children': []}]
    }

    if (largeWidth) {
        infoDisp();
    }
    return false;

}

function showParents(n) {
    let parentId = n.parentId
    if (!nodes[parentId].show)   {
        nodes[parentId].show = true;
        showParents(nodes[parentId])
    }
}

function updateVisibleDepth(n) {//used for transparency
    if (n.id == "root") {
        return
    }
    let parentId = n.parentId
    if (nodes[parentId].visibleDepth <= n.visibleDepth) {
        nodes[parentId].visibleDepth = n.visibleDepth + 1
        updateVisibleDepth(nodes[parentId])
    }
}

//calcule les nodes pour qui show=true et un seul lien max entre chaque paire affichée (=metalien)
//détermine visibleParentId et emplacement des nouveaux
//renvoie les noeuds et metaliens a afficher
function visibleNetwork() {
    //règles:
    //-si un noeud a son parent expanded=true, on le montre (show=true)
    //-si un noeud est focused, ou s'il est lié à un focused, on le montre
    //-si alwaysShowParent: si un noeud a show=true, on montre son parent
    //fonctionnement: user définit expanded et focus, show est calculé par le programme en fctn des règles
    //a faire:
    //0-faire une liste (displayedNodes?) de tous les noeuds à montrer (focus, linked to focus, parents?, son of expand)
    // 4-calculer visibleParentId de chacun si besoin, et leur nouvelle position si show=false
    //n-mettre show=true

    //noeuds à afficher. Correspond à show=true?

    //on montre les noeuds expanded ou dont le parent expanded
    let imgCounter = 0;
    for (let k in nodes) {
        nodes[k].prevShow = nodes[k].show;//pour faire popper au bon endroit éventuellement
        nodes[k].show = nodes[k].expanded || nodes[nodes[k].parentId].expanded || false;
        nodes[k].visibleDepth = 0;

    }

    //on montre le focuses et ses liens, et leurs parents
    if (focus) {
        let focusedNode = nodes[focus]
        focusedNode.show = true;
        if (params.alwaysShowParent) {
            showParents(focusedNode)
        }
        for (let k in focusedNode.linked) {
            focusedNode.linked[k].show = true;
            if (params.alwaysShowParent) {
                showParents(focusedNode.linked[k])
            }
        }
    }

    for (let id in nodes) {
        if (!nodes[id].hasFeaturedDesc && params.cleanNonFeatured){
            nodes[id].show=false
        }
        if ((nodes[id].img != undefined) && (nodes[id].show) && imgCounter < params.simultImg) {
            imgCounter++;
            nodes[id].imgDisp = true
        }
    }


    //on determine le parent visible de chacun, même les noeuds cachés, pour faire les méta-liens
    //et pour déterminer les coodronnées initiales
    for (let k in nodes) {
        let nodek = nodes[k];
        //avant tout, si le noeud vient de popper, on tire la position initiale proche de l'ancien visibleparent
        if (nodek.show && !nodek.prevShow) {
            //just popped
            //on les fait apparaitre pres de leur visibleParentId
            nodek.x = nodes[nodek.visibleParentId].x + 350 * (Math.random()-0.5);//eventuellement allonger si bcp d'enfants
            nodek.y = nodes[nodek.visibleParentId].y + 350 * (Math.random()-0.5);
            //to put speed at 0: (px=previous x)
            nodek.px = nodek.x;
            nodek.py = nodek.y;
        }
        if (nodek.show) {
            nodes[k].visibleParentId = k
            if (nodek.isLeave || !nodek.expanded) {//si c'est une feuille ou un noeud fermé, marche pas pour focus parent
                updateVisibleDepth(nodek)//on maj toute la hierarchie au dessus
            }
        } else {
            let looking = true;
            let current = k;

            while (looking) {
                let crtNode = nodes[current];
                let parentId = crtNode.parentId;
                if (crtNode.show === false) { //si le noeud est caché
                    //on va regarder si son parent est visible
                    current = parentId;
                } else {
                    //crtNode est le visibleParentId


                    looking = false;

                    //cet attribut servira plus tard pour l'affichage des couleurs et des enveloppes
                    nodek.visibleParentId = current;



                }
            }
        }
    }

    let displayedNodes = [],
        displayedNodesMap = [],
        i = 0;
    for (let k in nodes) {

        if (nodes[k].show) {
            displayedNodes.push(nodes[k]);
            displayedNodesMap[k] = i;
            i++;
        }
    }

    //2ème partie: on calcule les liens visibles
    let linksMap = [];
    //on retournera une liste synthétique sans répétition ou auto-lien, "metaLinks"
    //chaque lien synth contient la liste de ses sous liens dans link.subLinks
    let metaLinks = [],
        j = 0;
    for (let k = 0; k < links.length; ++k) {
        //on modifie les indices des sources pour qu'elles correspondent aux parents visibles
        let visibleSourceIndex = displayedNodesMap[nodes[links[k].source].visibleParentId];
        let visibleTargetIndex = displayedNodesMap[nodes[links[k].target].visibleParentId];
        if ((visibleSourceIndex != visibleTargetIndex) ) {

            let linkid = visibleSourceIndex + "|" + visibleTargetIndex;

            //on ajoute a la liste entre ces 2 parents visibles, ou on la créee
            if (linksMap[linkid]) {
                let i = linksMap[linkid];
                metaLinks[i].subLinks.push(links[k]);
                metaLinks[i].params = {
                    'type': "Liens multiples",
                }
            } else {
                linksMap[linkid] = j;
                metaLinks[j] = {
                    source: visibleSourceIndex,
                    target: visibleTargetIndex,
                    subLinks: [links[k]],
                    params: links[k].params || {}
                };
                //(j,"lien",k,"de",visibleSourceIndex,"vers",visibleTargetIndex,metaLinks[j],links[k])
                j = j + 1;
            }
        }
    }

    return {
        links: metaLinks,
        nodes: displayedNodes
    }

}


function init(adapt) {
    if (force) force.stop(); //useful?
    console.log('init',nodes)
    //renvoie une liste de noeuds qui ont un id et de liens qui ont une source et une target (entre autres)
    net = visibleNetwork();

    console.log('done',net)
    //removeInfos()?
    //if (adapt) {

    //};


    force = d3.layout.force()
        .nodes(net.nodes)
        .links(net.links)
        .size([width / 2, height / 2])
        //.linkDistance(function(l, i) { return 600; })
        .linkStrength(function (l, i) {
            return ((l.source.id === focus) || (l.target.id === focus) || (l.params.type === "belongsTo")) ? .3 : 0.1;
        })
        .charge(function (n, i) {
            return (n.id === focus ? -200*n.radius : -150*n.radius);
        })
        //.gravity(0.1)
        .chargeDistance(800)
        .friction(.6)
        .start();


    //A noter: force transforme links: il remplace link.source.id par l'objet source, etc...

    //convex hull cursor text------------
    /*vis.on("mouseover",function(){
    x = d3.mouse(this) [ 0 ] ;
    y = d3.mouse(this) [ 1 ] ;
    crsrText.attr("x",x)
    .attr("y",y)
    .attr("display","");
})

  vis.on("mousemove",function(){
    x = d3.mouse(this) [ 0 ] ;
    y = d3.mouse(this) [ 1 ] ;
    crsrText.attr("x",x)
    .attr("y",y)
    .attr("display","");
  })

  vis.on("mouseout",function(){
    crsrText.attr("display","none");
  })*/

    //hulls remove-----------------------
    hullg.selectAll("path.hull").remove();
    //selection des env conv avec la classe path.hull
    let hull = hullg.selectAll("path.hull")
        .data(convexHulls(net.nodes, off))
        .enter().append("path")
        .attr("class", "hull")
        .style("fill", d => fill(nodes[d.parentId].visibleParentId))
        .style("opacity", d => d.parentId == "root" ? 0.1 : Math.max(0.1, 1 - nodes[d.parentId].visibleDepth / 3))
        //.attr("d", drawCluster)
        .style("stroke-width", "8px")
        .style("stroke", "blue")//d => fill(nodeById(d.parentId).visibleParentId))
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "crosshair")
            //crsrText.text(name(d.parentId))
        })
        .on("click", function (d) {
            if (d.parentId != "root") {
                focus = d.parentId;
                collapseNode(nodes[d.parentId]);
                init(false);
            }
        });


    //nodes display-------------------
    if (node) {
        node.remove();
    } //on peut aussi n'enlever que certains noeuds
    //selection des noeuds visibles, avec la classe "node"
    node = nodeg.selectAll(".node").data(net.nodes, d => d.id); //, nodeid);

    //node.exit().remove();
    node.enter()
        .append("g")
        .attr("class", "node")
        //.attr("display", d => d.id == "root" ? "none" : "block")
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .attr("transform", d => "translate(" + d.x + "," + d.y + ")")
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", d.id === focus ? d.expanded || d.isLeave ? "crosshair" : "col-resize" : "help")
            lightNodeLinks(d, "on")
        }).on("mouseout", function (d) {
        lightNodeLinks(d, "off")
    })
        .on("click", function (d) {
            if (largeWidth) {
                infosFocus(focus, d);
            }//modifie les infos aussi
            if (focus == d.id && !d.isLeave) {
                d.expanded = true;
                if (d.children.length == 0) {
                    removeInfos();
                }
            } else {
                focus = d.id;
            }
            init(false);
        })

    nodec = node.append("circle")
        .attr("stroke-width", d => d.isLeave ? d.id == focus ? 10 : "1px" : 5 * (d.depth))
        .style("opacity", d => d.id == "root" ? 0.1 : Math.max(0.1, 1 - d.visibleDepth / 3))
        .attr("stroke", d => (d.id === focus) ? "red" : 'grey')
        //.style("fill-opacity", d => d.expanded ? 0 : 1)
        .attr("r", d => d.radius)
        .attr("cx", 0)
        .attr("cy", 0)
        .style("fill", d => d.expanded ? fill(d.id) : fill(nodes[d.parentId].visibleParentId))


    node.append("svg:image")
        .attr("xlink:href", d => d.imgDisp ? d.img : null)//?d.img:"") //function(d) { return d.img;})
        .style("opacity", d =>  d.visibleDepth>0? d.inheritedPic? 0 : Math.max(0.1, 1 - d.visibleDepth / 3) : 1 )//Math.max(0.1, 1 - d.visibleDepth / 3))
        .attr("x", d => -d.radius)// function(d) { return -25;})
        .attr("y", d => -d.radius)//function(d) { return -25;})
        .attr("height", d => 2 * d.radius)
        .attr("width", d => 2 * d.radius);

    //.on("mouseout",d =>  infog.setAttribute("display","none"));

    node.append("rect")
        .attr("class", "boxname top")


    //rectangles avec nom sur chaque noeud
    node.append("rect")
        .attr("class", "boxname middle")

    node.append("text")
        .attr("x", 0)
        .style("font-family", "American Typewriter, serif")
        .attr("y", d => d.lastName ? d.imgDisp ? "2em" : "-1.2em" : d.imgDisp ? "3em" : 0)
        .text(d => d.firstName)//+d.visibleDepth)//+(maxGen-d.generation))
        .each(function (d) {
            let box = this.parentNode.getBBox();
            d.bb1x = -box.width / 2 - 5;
            d.bb1w = box.width + 10;
        })

    node.selectAll(".top")
        //.attr("rx",10)
        .attr("x", d => d.bb1x - 2)
        .attr("y", d => d.imgDisp ? "1em" : "-2em")// -37)
        .attr("display", d => d.lastName ? "block" : "none")
        .attr("width", d => d.bb1w || 10)
        .attr("height", 21)


    node.append("text")
        .style("font-size", "18px")
        .style("font-family", "American Typewriter, serif")
        .attr("x", 0)
        .attr("y", d => d.imgDisp ? "3em" : 0)
        .text(d => d.lastName || "")
        .each(function (d) {
            let box = this.getBBox();
            d.bb2x = -box.width / 2 - 5;
            d.bb2w = box.width + 10;
        })


    node
        .selectAll(".middle")
        //.attr("rx",6)
        .attr("x", d => d.lastName ? d.bb2x + 2 : d.bb1x + 2)
        .attr("y", d => d.imgDisp ? "2em" : "-1em")
        .attr("width", d => d.lastName ? d.bb2w : d.bb1w)
        .attr("height", 23)

    node.append("text")
        .style("font-size", "10px")
        .style("font-family", "American Typewriter, serif")
        .attr("dy", d => d.imgDisp ? "3.8em" : "1.3em")
        .text(d => nodes[d.parentId].name)
        .attr("y", d => d.imgDisp ? "3em" : 0)

    //only for mouseover event
    node.append("circle")
        .style("opacity", .001)
        .attr("r", d => d.radius)

    node.sort(nodeSort)

    //links display------------
    if (link) {
        link.remove();
    } //on pourrait aussi n'enlever que certains liens
    link = linkg.selectAll("link").data(net.links);


    link.enter().append("g")
        .attr("class", "link")
        .attr("transform", d => "translate(" + d.source.x + "," + d.source.y + ")")
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "help")
            lightLink(d.source.id, d.target.id, "on")
        })
        .on("mouseout", d => lightLink(d.source.id, d.target.id, "off"));

    linkp = link.append("polygon")
        .attr("class", d => ((d.source.id === focus) || (d.target.id === focus)) ? "focus" : "background")
        .attr("stroke", d => ((d.source.id === focus) || (d.target.id === focus)) ? "red" : "grey")
        .attr("opacity", d => ((d.source.id === focus) || (d.target.id === focus)) ? 1 : 0.2)
        .attr("points", function (d) {
            let dx = d.target.x - d.source.x;
            let dy = d.target.y - d.source.y;
            return "0 0 " + dx + " " + dy
        })
        //.attr("display", d => d.params.type === "belongsTo" ? "block" : "block")
        .style("stroke-width", d => d.params.type === "belongsTo" ? params.belongsToLinkWidth : 10)
        .on("click", function (d) {
            focus = d.source.id;
            if (largeWidth) {
                removeInfos();
                infos = [d, {
                    texte: "Liens",
                    "off": 10,
                    "deployedInfos": true//sert à savoir si l'info est déployée (non par défaut)
                }]
                for (let i in d.subLinks) {
                    infos.push(d.subLinks[i])
                }
                infoDisp();
            }
        });

    link.sort(linkSort)


    //Force updates------------------------------

    //node.call(force.drag);

    force.on("tick", function (e) {
        if (!hull.empty()) {
            hull.data(convexHulls(net.nodes, off))
                .attr("d", drawCluster);
        }

        let minY = net.nodes.reduce((min, p) => p.y < min ? p.y : min, net.nodes[0].y);
        let maxX = net.nodes.reduce((max, p) => p.x > max ? p.x : max, net.nodes[0].x);//unused
        let minX = net.nodes.reduce((min, p) => p.x < min ? p.x : min, net.nodes[0].x);


        //evolution des noeuds en les ramenant dans le cadre
        node.each(function (d) {
            d.x = minX < 100 ? d.x + 50 * e.alpha : d.x //:d.x>width?d.x-d.x+100*e.alpha:d.x;
            d.y = minY < 0 ? d.y + 50 * e.alpha : d.y;
        })
        node.attr("transform", d => "translate(" + (d.x) + "," + (d.y) + ")");

        //Evolution des liens et de leurs enveloppes
        link.attr("transform", d => "translate(" + (d.source.x) + "," + (d.source.y) + ")")
        linkp.attr("points", function (d) {
            let dx = (d.target.x) - (d.source.x);
            let dy = (d.target.y) - (d.source.y);
            return "0 0 " + dx + " " + dy
        })


    });

    console.log('adapt')
    setTimeout(adaptZoom, 1000);


}


/*function linkid(l) {
  let u = nodeid(l.source),
  v = nodeid(l.target);
  return u<v ? u+"|"+v : v+"|"+u;
}*/


function infoDisp() {
    console.log(infos)
    //lit l'info de d et affiche les infos correspondantes
    infoWidth = 300;
    //on enleve tout
    infoG.selectAll(".infoblock").remove()
    let off = 10;
    //sert à mettre la croix de fermeture
    let firstBlock = true;
    //sert à savoir si on affiche le prochain subblock
    let displaySubBlocks = true;

    for (let i in infos) {
        let d = infos[i]
        let prevHeight = infog.getBBox().height + 5;

        //cadre titre
        let info = infoG.append("g")
            .data([d])
            .attr("class", "infoblock")
            .attr("transform", "translate(" + (d.off || off) + "," + prevHeight + ")")

        //rectangle du cadre titre
        info.append("rect")
            .data([d]).attr("fill",d => fill(d.id)||'lightblue')
            .attr("height", 30)
            .attr("width", infoWidth)
            //.attr("stroke-width",2)
            //.attr("stroke","black")
            .style("opacity", .4)
            .attr("rx", 5)

        //flèche de deploiement
        info.append("text")
            .attr("fill", "lightblue")
            .attr("x", 5)
            .attr("y", 20)
            .attr("font-size", 15)
            .text(d.deployedInfos ? "\u25bc" || "V" : "\u25b6" || ">")
            .on("mouseover", function (d) {
                d3.select(this).style("cursor", "pointer")
                //crsrText.text(name(d.parentId))
            })
            .on("click", function (d) {
                d.deployedInfos = !d.deployedInfos;
                infoDisp()
            })

        if (firstBlock) {
            //croix de fermeture
            let closeBox = info.append("g")
                .attr("transform", "translate(" + infoWidth + ",1)")
                .attr("display", firstBlock ? "block" : "none")
                .on("click", removeInfos)
                .on("mouseover", function (d) {
                    d3.select(this).style("cursor", "pointer")
                    //crsrText.text(name(d.parentId))
                })
            closeBox.append("rect")
                .attr("x", -28)
                .attr("height", 28)
                .attr("width", 28)
                .attr("fill", "white")
                .attr("rx", 5)

            closeBox.append("text")
                .attr("x", -27)
                .attr("y", 23)
                .attr("font-size", 26)
                .text("\u2573" || "X")
        }
        firstBlock = false;

        if (d.texte === "Liens" || d.texte === "Contient") {
            displaySubBlocks = d.deployedInfos

            info.append("text")
                .text(d.texte)
                .attr("x", 31)
                .attr("y", 20)
                .attr("font-size", 16)

            off = 20;
        } else if (displaySubBlocks) {
            //transform result en [key,value]


            //textwrap bug et n'affiche pas la 1re info donc je mets une info vide pour contrer ça
            let result = [
                ["", ""]
            ];
            if (d.source) { //il s'agit d'un lien
                let fromField = "";//liste de toutes les sources (si multilien)
                let toField = "";//liste de toutes les target
                for (let i in d.subLinks) {
                    fromField = fromField + (i == 0 ? "" : ", ") + nodes[d.subLinks[i].source].name;
                    toField = toField + (i == 0 ? "" : ", ") + nodes[d.subLinks[i].target].name;
                }
                result.push(["de", {
                    "texte": fromField
                }], ["vers", {
                    "texte": toField
                }]);
            } else { //il s'agit d'un noeud
                if (d.children && d.children.length > 0 && (i > 0)) {
                    let childrenNames = "";
                    for (i in d.children) {
                        childrenNames = childrenNames + (i === 0 ? "" : ", ") + (d.children[i].name || "");
                    }
                    result.push(["Contient:", {
                        "texte": childrenNames
                    }])
                }
                if (d.linked && d.linked.length > 0) {
                    //maybe problem because linked contains objects now, not just ids
                    result.push(["liens avec", {
                        "texte": d.linked.map(n => nodes[n.id].name).join()
                    }])
                }

            }
            if (d.params) {
                result = result.concat(Object.entries(d.params))
            }


            //titre
            info.append("text")
                .text(d.id ? nodes[d.id].name : d.source ? d.source.id ? nodes[d.source.id].name + (" \u2b0c " || " <-> ") + nodes[d.target.id].name : nodes[d.source].name + (" \u2b0c " || " <-> ") + nodes[d.target].name : d.texte)
                //.attr("font-family","American Typewriter")
                .attr("font-size", d.source ? 10 : 15)
                .attr("x", 30)
                .attr("y", 20)
                .on("mouseover", function (d) {
                    d3.select(this).style("cursor", "pointer")
                    //crsrText.text(name(d.parentId))
                })
                .on("click", function (d) {
                    //on range l'ancien focus, sauf si on clique sur un noeud déballé
                    infosFocus(focus, d);
                    focus = d.id;
                    init(false);
                })

            let bckgrdRect = info.append("rect")
                .attr("fill", d=> fill(d.id)||'lightblue')
                .attr("y", 30)
                .attr("height", 0)
                .attr("width", infoWidth)
                .style("opacity", .8)


            let infoSubBlock = info.append("text")
                .attr("display", d.deployedInfos ? "block" : "none")
                //.attr("y",100)
                .attr("transform", d => "translate(0," + (d.img?params.imgHeights:0) + ")")
                .selectAll(".smalltext")
                .data(result)
                .enter()


            //img eventuelle
            let imgInfo = info.append("svg:image")
                .attr("display", d => (d.img && d.deployedInfos) ? "block" : "none")
                .attr("xlink:href", d => d.img)//?d.img:"") //function(d) { return d.img;})
                .attr("x", 30)//infoWidth/2-50)//d=>-d.radius)// function(d) { return -25;})
                .attr("y", "3em")//d=>-d.radius)//function(d) { return -25;})
                .attr("height", 100)
            //.attr("width",100);

            //on met a jour la hauteur du bloc au fur et a mesure
            let blockHeight = 48;
            //on met les textes avant les titres pour calculer la hauteur du bloc au passage
            infoSubBlock
                .append("tspan")
                .filter(d => d[1].texte)
                .attr("class", "smalltext")
                .attr("y", function (d) {
                    d.height = blockHeight;
                    //calcul approximatif de la hauteur du texte une fois formatté
                    blockHeight = blockHeight + infoTextSize * Math.floor(3 + .55 * d[1].texte.length * infoTextSize / infoWidth);
                    return d.height
                })
                .text(d => d[1].texte)
                .attr("font-size", infoTextSize)
                .each(function () {
                    d3plus.textwrap()
                        .container(d3.select(this))
                        .width(infoWidth)
                        .height(height)
                        .draw();
                })
                //on saute une ligne à la fin
                .append("tspan")
                .text("   ")
                .attr("dy", 20);

            //on place les titres
            infoSubBlock
                .append("tspan")
                .filter(d => d[1].texte)
                .text(d => d[0])
                .attr("stroke", "green")
                .attr("stroke-width", .5)
                .attr("font-size", 16)
                .attr("y", d => d.height) //calculé dans le bloc d'avant
                .attr("x", 0)
                .append("a")
                .attr("href", d => d[1].url)
                .attr("target", "_blank")
                .text(d => d[1].url ? " (source " + d[1].source + ")" :
                    "")
                .attr("font-size", 10)
                .attr("stroke", "blue")


            //on calcule la nouvelle hauteur pour placer le prochain bloc
            let newHeight = infog.getBBox().height - 25 - prevHeight;
            bckgrdRect.attr("height", newHeight)

        } else {
            info.style("display", "none")
        }

    } //end of for loop


} //end of function


//enlève toutes les infos en mettant aussi le paramètre deployedInfos=false
function removeInfos() {
    infoWidth = 0;
    infoG.selectAll(".infoblock").remove();
    for (let i in infos) {
        infos[i].deployedInfos = false;
    }
    infos = [];
    //adaptZoom()
}


function collapseNode(node) {
    //on peut simplifier avec des auto-appels récursifs
    node.expanded = false;
    for (let i in node.children) {
        collapseNode(node.children[i])
    }
}


function infosFocus(focus, d) {
    //si l'info du noeud n'est pas déjà affichée, on l'affiche, avec ses enfants et ses liens
    if (infos[0] != d) {
        removeInfos();
        d.deployedInfos = true;
        infos = [d]
        console.log("in function", infos)

        if (d.children.length > 0) {
            infos.push({
                texte: "Contient",
                "off": 10,
                "deployedInfos": true
            })
            for (let i in d.children) {
                infos.push(d.children[i])
            }
        }


        if (d.links.length > 0) {
            infos.push({
                texte: "Liens",
                "off": 10,
                "deployedInfos": true
            })

            infos = infos.concat(d.links)
        }
        infoDisp();
    } else if (d.children.length === 0) {
        removeInfos()
    }

}


function lightNode(id, p) {
    nodec.filter(d => (d.id === id)).attr("stroke", d => d.id == focus ? "red" : p === "on" ? "orange" : "grey")
}


function lightLink(id1, id2, p) {
    linkp.filter(
        d =>
            (d.source.id === id1 && d.target.id === id2))
        .attr("stroke", d => p === "on" ? "orange" : ((d.source.id === focus) || (d.target.id === focus)) ? "red" : "grey")
        .attr("opacity", d => p === "on" ? 1 : ((d.source.id === focus) || (d.target.id === focus)) ? 1 : 0.2)
    lightNode(id1, p)
    lightNode(id2, p)
}


function lightNodeLinks(d, p) {
    lightNode(d.id, p)
    for (let i in net.links) {
        if (net.links[i].source.id === d.id) {
            lightLink(d.id, net.links[i].target.id, p)
        }
        if (net.links[i].target.id === d.id) {
            lightLink(net.links[i].source.id, d.id, p)
        }
    }
}


/*function cutAppendText(d, i) {
    var a
    d3.select(this)
        .attr("stroke", (i === 0) ? "green" : "black")
        .attr("x", (Number.isInteger((i + 1) / 5)) ? 60 : a)
        .attr("dy", (Number.isInteger((i + 1) / 5)) ? 20 : a)
        .text(d => d + " ");


}*/

/*nombre de générations inférieures
function depth(d) {
    if (d.isLeave) {// || !d.show){
        return [0,null];
    } else {
        let max = 0;
        let guy='';
        for (let i in d.children) {
            let [dp,g] = depth(d.children[i]);
            if (dp > max) {
                guy=d.children[i].name
                max = dp
            }
        }

        return [1 + max,guy];
    }
}*/

/*nombre total de descendants
function size(node) {//pb: compte enfants invisibles
    let r = 1; //node.show? 0:1;
    for (let c in node.children) {
        r = r + size(node.children[c]);
    }
    return r;
}*/


function nodeSort(n1, n2) {
    if (n2.expanded) {
        return 1
    } else if (n1.expanded) {
        return -1
    } else if (focus === n1.id) {
        return 1
    } else if (focus === n2.id) {
        return -1
    } else if (n1.parentId === n2.id) {
        return 1
    } else if (n2.parentId === n1.id) {
        return -1
    } else if (n1.radius > n2.radius) {
        return -1
    } else {
        return 1
    }
}

function linkSort(l1, l2) {
    if (focus === l1.source || focus === l1.target) {
        return 1
    } else if (focus === l2.source || focus === l2.target) {
        return -1
    }
}


function cross(n, o) {
    o = n.radius
    return [
        [n.x - o, n.y - o],
        [n.x - o, n.y + o],
        [n.x + o, n.y - o],
        [n.x + o, n.y + o],
    ]
}

// constructs the convex hulls
function convexHulls(nodeGrp, offset) {//nodegrp: liste de noeuds
    let hulls = {};
    // create point sets - not for root
    for (let k = 1; k < nodeGrp.length; ++k) {
        let n = nodeGrp[k];

        //on détermine le visible parent et on l'ajoute au hull parent ou on le créée avec uniquement
        //le parent, puis on ajoute le noeud
        // (il se peut que seuls le noeud et son grand parent soient visibles)
        let visibleParentId = nodes[n.parentId].visibleParentId;
        let l = hulls[visibleParentId] || (hulls[visibleParentId] = cross(nodes[visibleParentId], offset));
        let cr = cross(n, offset)
        for (let z in cr) {//je ne sais pas pourquoi mais concat ne marche pas...erreur dans la couleur du hull
            l.push(cr[z]);
        }
        //l.push([n.x - offset, n.y + offset]);
        //l.push([n.x + offset, n.y - offset]);
        //l.push([n.x + offset, n.y + offset]);
        //on garde cette info pour la couleur
        l.parentId = n.parentId;


    }
    // create convex hulls
    let hullset = [];
    for (let i in hulls) {
        hullset.push({
            parentId: hulls[i].parentId,
            path: d3.geom.hull(hulls[i])
        });
    }

    //if (data.nodes [ 23 ] .show) {a = bbb;}//23 4

    return hullset;
}

function drawCluster(d) {
    return curve(d.path); // 0.8
}
