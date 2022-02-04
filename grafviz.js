

//improve perf:
//ne pas mettre les options au début/fichier séparé?

//TO DO
//petit bug: si je navigue dans les liens d'enfant en enfant dans le cadre, et qu'a la fin je
//double clic sur un enfant dans le graphe, les noeuds qui ont été ouverts dans le cadre
//se referment. Ils n'ont en effet pas été 'expanded' mais ils devraient s'ouvrir via 'showparents'
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
//pour les positions initiales, faire dans l'ordre ascendant pour pas être trop le bordel



//dans l'info:
//possibilité de fermer un hull/noeud depuis l'info
//chaque nom, noeud, etc...rencontré dans les infos doit être cliquable
//rajouter filiation dans les infos
//possibilité de naviger dans les infos des briques, sous briques etc...



let params = {
        screenRatio: 7/8,
        zoomFactor: 2, //plus c'est petit plus le graphe apparaitra grand
        dr: 44, // default point radius
        alwaysShowParent: false, // dès qu'un noeud sort tous ses ancetres également (pour l'instant vrai que pour le focused node)
        initialFocus: 'root',
        expand_first_n_gens: 1,
        hierarchyInfo: true, //affiche layer, descendants pour chaque noeud
        simultImg: 150000, //max number img to display
        imgHeights: 150,
        inheritPicFromChild: true,
        cleanNonFeatured: false, //remove nodes which only have non-featured descendants (incl. themselves)
        connectOtherParents: false, //put a link with non principal parents
        inheritLinks: 0, //0 nodes showed required to inherit link
        addOrphansToRoot: true, //les noeuds dont le parent n'est pas dans data est rattaché à root
        displayFiliation: true,
        biPartiteLinks: true,
        saveAllData: false,
        infoMax: 50,//max infoblocks to display
        //initialFocus;undef by default
    },
    linksWidth= {
        'Member of': 3,
        'Also member of': 1,
        'Multiple links': 5,
        'default':10
    },
    //const filename = "taxo-graph.json"
    focus,
    prevFocus,
    divName = "body",
    width = params.screenRatio * window.screen.width, // svg width
    height = width, // svg height
    largeWidth = true, //chartDiv.offsetWidth > 600,//permet d'afficher les infos
    off = params.dr;
    transCorrect={'x':width *0, 'y':0}//why these values??
//liste de toutes entrées de la DB, ce sera également les noeuds du graphe?
let nodes = [];
//tous les liens de la DB, y compris parenté, remplacé par metaLinks pour le tracé
let links = [];
//liste des infos à afficher, de la forme {key:value}
let infos = [];
let infoWidth = 0; //varie en fonction de info/removeInfos
let infoTextSize = 14;
let oldNodesNumber = params.oldNodesNumber || 10;//pour le zoom initial il faut savoir combien il y aura de noeuds à l'écran
let scaleFactor = 1;
let maxGen = 0;
const maxSearchResults=40;
let words={};
let net;
let force, link, linkp, node, nodec, focusedNode, focusX, focusY;

var zoomCounter=0



let meta_obj
//loading data
console.log('load data')
//load prepared data if any
d3.json('rtu-data/' + wdKey + '-rtu-data.json', function(error, json) {
	if (!error) {
		console.log('rtu ok')
		nodes = json.nodes
		params = json.params
		links = json.links
		idx = lunr.Index.load(json.idx)
		words = json.words || {}


		focus = params.initialFocus //nodes[1].id
		prevFocus = focus
		nodes[focus].deployedInfos = true

		console.log('nodes rtu', nodes, nodes[focus])
		infosFocus(nodes[focus])
		console.log("focus", focus, params.initialFocus)
		appendDbInfo('Starting simulation')
		infoDisp()
		init()
	} else {
    console.log('no rtu data',load_from_WD,wdjs)
		if (load_from_WD) {//load online from WD
			if (wdKey.endsWith('aths')) {
				document.getElementById("description").innerHTML = 'This page is a visualisation of informations about mathematicians entred by WikiData users.<br><br> Explore mathematicians lineages by expanding the nodes and/or searching in the form above. Try for instance "Pythagoras", "Fields", "Bernoulli", .... <br><br> If you disagree with the informations, you are welcome to modify them yourselves on Wikidata.org! The link is given on the left info panel.'

			}
			const endpointUrl = 'https://query.wikidata.org/sparql';
			const sparqlQuery = wdQuery(wdKey);
			console.log(sparqlQuery)
			console.log('querying...' + wdKey)
			appendDbInfo("Query from WikiData.org, please wait...");
			const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
			meta_obj=queryDispatcher.query(sparqlQuery).then(treatWDDB);
		} else if (wdjs) {//load from locally saved WD data
			if (wdKey.endsWith('aths')) {
				document.getElementById("description").innerHTML = 'This page is a visualisation of informations about mathematicians entred by WikiData users.<br><br> Explore mathematicians lineages by expanding the nodes and/or searching in the form above. Try for instance "Pythagoras", "Fields", "Fourier", .... <br><br> If you disagree with the informations, you are welcome to modify them yourselves on Wikidata.org! The link is given on the left info panel.'

			}
			console.log('wdjs, loading file')
			meta_obj=$.getJSON("wdOffline/" + wdKey + ".json", treatWDDB)
		} else {//load from GV data file
      console.log('json?',filename)
			//lance la simu

			d3.json(filename, function(error, json) {//very long to execute...
        json.params=json.params || {}
        words=json.words||{}
				console.log('file params', json.params)
				if (json.params.description) {
          document.getElementById("description").innerHTML = json.params.description  };
				//if (error) throw error;
				meta_obj = buildNodesLinks(json)



				//effet "apparition progressive"
				/*vis.attr("opacity", 1e-6)
				.transition()
				.duration(3000)
				.attr("opacity", 1);*/ //empêche le zoom initial... :(


			});
		}

	}
})



const curve = d3.svg.line()
    .interpolate("cardinal-closed")
    .tension(.85)


//document.getElementById("focus_p").innerHTML = focus

const fill = d3.scale.category20();
// --------------------------------------------------------

let idx;


//3eme partie: on fait l'index pour la recherche
//$.getJSON(filename, function(json) {
function makeIndex(entries) {

    console.log('entries', entries)
    idx = lunr(function() {
        this.ref('id')
        this.field('name', {
            boost: 10
        })
        this.field('strParams')

        for (id in entries) {
            //idealement il  faudrait enlever les keys du json
            entries[id].strParams = (entries[id].feat? (entries[id].name+' ').repeat(10) : '')+JSON.stringify(entries[id].options).replace(/[^0-9a-z]/gi, ' ')
            this.add(entries[id])
        } //, this)
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


zoomCanvas.on("mouseover", function() {
        d3.select(this).style("cursor", "all-scroll")
    })
    .call(zoom) // delete this line to disable free zooming
    .call(zoom.event);


//info text when cursor is over convex hull
//crsrText = vis.append("text").attr("id","crsrtxt");


function zoomed() {
  let x=d3.event.translate[0]-transCorrect.x
  let y=d3.event.translate[1]-transCorrect.y
    /*prevTgt=msTgt;
    msTgt="root"//d3.event.sourceEvent.target.id||"root";
    if (msTgt==="canv" && prevTgt==="canv") {*/
    vis.attr("transform", "translate(" +( x)+","+(y) + ")scale(" + (d3.event.scale) + ")")
    //infoG.attr("transform", "translate(0,"+d3.event.translate[0]+")")
}

function adaptZoom() {
    //calcul du nouveau zoom basé sur le nb de noeuds.
    newNodesNumber = net.nodes.length
    scaleFactor = zoom.scale() * Math.pow(oldNodesNumber / (newNodesNumber),0.5) //(width - 100) / (200 * (infoWidth / 150 + Math.sqrt(net.nodes.length) + 1)) / params.zoomFactor

    console.log('zoom',newNodesNumber,scaleFactor)
    focusX = nodes[focus].x || 0
    focusY = nodes[focus].y || 0
    //console.log('scale',scaleFactor,focusX,focusY,oldFocusX,oldFocusY)
    //on recale le canvas a gauche du texte, le graphe est censé translater tout seul via une force spécifique
    vis.transition()
        .duration(zoomCounter<1?2000:300)
        .call(zoom
            .scale(scaleFactor)
            //.translate([width *2/3 , width / 4 ]) // width/2-(  nodes[focus].x)*scaleFactor, 200-(  nodes[focus].y)*scaleFactor])
            //.translate([width/2-focusX*scaleFactor,width/4-focusY*scaleFactor])// width/2-(  nodes[focus].x)*scaleFactor, 200-(  nodes[focus].y)*scaleFactor])
            .event);
    oldNodesNumber = newNodesNumber
    zoomCounter+=1
    console.log('zoomcounter',zoomCounter)
    if (zoomCounter<3){
    setTimeout(adaptZoom,2000)
  }
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
    //console.log('keys',keys(data.nodes))
    appendDbInfo( 'Processing DB, ' +(filename?filename:wdKey)+ ', '+Object.keys(data.nodes).length + ' nodes')
    //priorité aux params du fichier:
    const keys = data.params?Object.keys(data.params):[]
    for (let k in keys) {
        params[keys[k]] = data.params[keys[k]]
          console.log(keys[k],params[keys[k]])
    };
    console.log(params)
    for (let k in data.linksWidth) {
        linksWidth[k] = data.linksWidth[k]
    }
    console.log('data', data)

    //empty children linked links, initial x y random, deployedInfos prevshow=false
    function initialise(n) {
        if (n.firstName){
          n.lastName=n.lastName||''
          n.name=n.name || (n.firstName+' '+n.lastName)
          n.lastName=shorten(n.lastName)
        } else {
          n.name=n.name || n.id
          names=n.name.split(' ')
          n.firstName = shorten(n.firstName || names.shift())
          n.lastName = shorten(n.lastName || names.join(' '))
        }
        n.shortName=n.shortName || shorten(n.name)
        n.name = n.name+(n.feat?' °':'')
        n.children = [];
        n.x = 100 + width * Math.random();
        n.y = 300 * Math.random();
        n.px = n.x
        n.py = n.y;
        n.radius = params.dr;
        n.prevShow = false;
        n.linked = [];
        n.links = [];
        n.deployedInfos = false; //détermine si l'info est déployée (non par défaut)
        n.visibleParentId = "root" //nodes.length;
        n.expanded = n.expanded || false; //pas développé par défaut
        n.isLeave = false //feuilles de l'arbre = pas d'enfant
        n.visibleDepth = 0
        n.descendants = 0
        n.depth = 0
        n.depthGuy = ''
        n.feat = n.feat || false
        n.hasFeaturedDesc=n.feat
        n.options=n.options||{}
        //n.otherParents=n.otherParents || new Set()
        return n;
    }

    //extract nodes
    //TO do: start from root, include nodes iteratively
    //if a node has a child already registered as child of another parent,
    //younger link is privileged. Detect if node is self descendant?
    //nodes that are not descendants of roots will be ignored

    //
    dictNodes={}//transform nodes in dict if needed
    for (let i in data.nodes){
      let n = data.nodes[i]
      if (n.id in dictNodes){
        console.log('error: 2 nodes with id ',n.id,n)
          window.alert('error: 2 nodes with id ',n.id)
      }
      dictNodes[n.id]=n
    }

    if (!dictNodes['root']){
      dictNodes['root']={'id':'root','parentId':'root'}
    }
    console.log('dataInfo: ',' dictNodes  ',Object.keys(dictNodes).length,dictNodes)
      //appendDbInfo(   "dataInfo: "+Object.keys(dictNodes).length+"nodes");


    //checker si il n'y a pas des noeuds a créer via des target de liens
    let nodesCreatedByLinks=0
    for (let i in data.links) {
        let l = data.links[i];
        if (!dictNodes[l.target])
         {
           nodesCreatedByLinks++
            dictNodes[l.target] = {
                id: l.target,
                //il peut y avoir plusieurs last names
                name: l.targetName,
                parentId: l.targetParentId,
                expanded: false,
                options: {}
            }
        }
    }
    console.log('dataInfo: ',nodesCreatedByLinks,'nodes created by link')
    if (nodesCreatedByLinks>0) { appendDbInfo(  nodesCreatedByLinks+' nodes created by link,')};

    let merges=0
    let dataChildren = {'root':['root']} //id->list of children,temp?
    for (let id in dictNodes) {
        let n = dictNodes[id]
        //3 possibilités: pas de otherParent, otherParent.value singleton, otherParent.value set
        parents=new Set()
        parents.add(n.parentId)
        if (n.options && n.options['Also member of']){//already a value
          if (n.options['Also member of'].value.size){//which is a set
            parents=n.options['Also member of'].value
          } else {//a singleton
            parents.add(n.options['Also member of'].value)
          }
        }

        parents.add(n.parentId)
        hasAvailableParent=false
        parents.forEach(function(p){
          if (p in dictNodes){
            hasAvailableParent=true
            if (p in dataChildren) {
                dataChildren[p].push(id)
            } else {
                dataChildren[p] = [id]
            }
          }
        })
        if (!hasAvailableParent && params.addOrphansToRoot) {
            dictNodes[id].parentId = 'root'
            dataChildren['root'].push(id)
        }
    }


    let crtGen = 0;
    let pendingParents = new Set()
    let initialisations = 0

    function setParent(n,p){
      if (n.parentId != p){
        n=addOptionValue(n,'Also member of',{'value':n.parentId})
        n.options['Also member of'].value.delete(p)
        n.parentId=p

      }
      return n
    }
    //build nodes object
    nodes={}

    function createDesc(p, id) {
        //console.log(counter)
        if (!(id in nodes)){
          //console.log('create',p,id)
            //console.log('add',id,'parent',p)
            initialisations++
            let n = initialise(dictNodes[id])
            n=setParent(n,p)
            n.generation = crtGen;
            nodes[id] = n
            } else
        { //noeud existe deja comme enfant de qqn d'autre
            if (crtGen > nodes[id].generation) { //on choisit la generation la plus basse
                //console.log('changeparent',p,id,nodes[id].parentId,nodes[id])
                setParent(nodes[id],p)
                //console.log('after',nodes[id].parentId,nodes[id])
                nodes[id].generation = crtGen
                //console.log('change',id,p)
            } else {
              //console.log('nochange',p,id)
                return
            }
        }
        let kids = dataChildren[id] || []
        crtGen++;
        pendingParents.add(id)
        for (let c = 0; c < kids.length; c++) {
            kidId = kids[c]
            if (kidId=='root'){
              continue
            }
            if (pendingParents.has(kidId)) {
                dataChildren[id].splice(c, 1)
                c--
                window.alert('error, own descendant :'+kidId+', '+ id)
                console.log('then', kidId, id, 'own descendant, removed', dataChildren[id])
                continue //skip this one
            }
            createDesc(id, kidId)
            /*if (n.img == undefined){
            n.img=nodes[kids[c]].img
          }*/
        }
        pendingParents.delete(id)
        crtGen--;

        //nodes[id].descendants=n.descendants//ne semble pas marcher avec le rayon
        //return n.descendants

    }

    createDesc("root", "root")
    //console.log(x,'au total')
    console.log('dataInfo: Retained ',Object.keys(nodes).length , ' single nodes descending from root, processing hierarchy, initialisations:',initialisations);

      appendDbInfo(   Object.keys(nodes).length + ' single nodes descending from root');



    /*if (createOrphans) {
    nodesMap['orphans'] = nodes.length; //0 au début, grandit au fur et à mesure
    orph = initialise({'id': 'orphans', 'parentId': 'root', 'expanded': false, 'name': 'Orphans', 'params':[]}) //initialise pour l'affichage
    nodes.push(orph)

    links.push({
    source: 'orphans',
    target: 'root',
    params: {
    'type': "Member of"
  }

});
}*/


    console.log(nodes, links)
    nodes['root'].expanded = true;


    //build children lists and links
    for (let i in nodes) {
        let nodei = nodes[i];
        parent = nodes[nodei.parentId]
        nodei.show = parent.expanded;
        nodei.options['Member of'] = {
            'value': parent.name || nodei.parentId,
            'priority': 1
        }
        if (i != "root") {
            parent.children.push(i);
        }
    }


    let hidden=0
    console.log('computeDesc', nodes)
    let currentFiliation=[]
    //on peut desormais calculer depth et descendants
    total = computeDesc("root")

    function computeDesc(id) {
        let n = nodes[id]
        currentFiliation.push(n.name)
        let max = 0,
            guy = null,
            img = n.img,
            desc = 0,
            hasFeaturedDesc = n.hasFeaturedDesc;
        for (let c = 0;c<n.children.length;c++) {
            let [kidDesc, dp, g, descImg, kidHasFD] = computeDesc(n.children[c])
            if ( kidHasFD || !params.cleanNonFeatured ) {
              if (dp > max) {
                  max = dp
                  guy = nodes[n.children[c]].name
              }
              if (img == null && params.inheritPicFromChild && id != 'root') {
                  nodes[id].inheritedPic = true
                  img = descImg
              }
              desc += kidDesc
              hasFeaturedDesc = hasFeaturedDesc || kidHasFD
            } else {
              if (nodes[id].children.length>40){//too slow to load children
              nodes[id].children.splice(c,1);
              c--
            }
            }


        }
        if (!hasFeaturedDesc){
          hidden++
          //console.log('hidenonfeat',id)
        }
        currentFiliation.pop()
        if (params.displayFiliation) {
          nodes[id].options.Filiation={'value':new Set(currentFiliation),'priority':6}
        }
        nodes[id].hasFeaturedDesc = hasFeaturedDesc
        nodes[id].descendants = desc
        nodes[id].depth = max
        nodes[id].depthGuy = guy
        nodes[id].img = img



        return [1 + desc, max + 1, guy, img, hasFeaturedDesc]

    }
    console.log('dataInfo: hidden',hidden)

    if (params.cleanNonFeatured){
          appendDbInfo(  hidden+' non-featured nodes hidden, remaining '+(Object.keys(nodes).length-hidden));
        }


    for (let i in nodes) {
        //on ajoute les liens de parenté
        links.push({
            source: i,
            target: nodes[i].parentId,
            'type': "Member of"
        });
        if (params.connectOtherParents && nodes[i].options['Also member of']) {
            let loopOver = nodes[i].options['Also member of'].value.size? nodes[i].options['Also member of'].value : [nodes[i].options['Also member of'].value]
            loopOver.forEach(function(p) {
                if (p in nodes) {
                    data.links.push({
                        source: i,
                        target: p,
                        'type':  'Also member of'

                    });
                }
            });
        }
    }
    //extract links from data

    console.log('links',links)

    for (let i in data.links) {
        //il y a des checks a faire ici...
        let linki = data.links[i] || {
            target: ""
        };
        //target required
        if (linki.target != "") {
            linki.infosToDisplay = collectInfos(linki)
            links.push(linki)
            //on verifie que parent existe, ou target Parent
            if (!(linki.target in nodes)) {
                console.log(i, "target inconnu", linki.parentId);
                let a = bb;
            }

            //pour chaque noeud on a la liste "linked", qui contient les noeuds avec lesquels il est lié, et une liste "links", qui contient les liens eux-mêmes
            nodes[linki.source].linked.push(linki.target);//used for focus
            nodes[linki.source].links.push(linki);//used for info and lightnode
            if (params.biPartiteLinks) {
              nodes[linki.target].linked.push(linki.source);
              nodes[linki.target].links.push(linki);
            }
        }
    }

    console.log('children created')


    //on calcule la taille de chacun, y compris noeuds nouvellement créés

    for (let i in nodes) {
        //nodes[i].descendants = size(nodes[i]) - 1
        nodes[i].radius = params.dr + Math.min((nodes[i].descendants), 100)
        //[nodes[i].depth,nodes[i].depthGuy] = depth(nodes[i])
        nodes[i].isLeave = (nodes[i].children.length == 0) //feuille de l'arbre = pas d'enfants
        if (nodes[i].options['Layer']<=params.expand_first_n_gens){
          nodes[i].show=true
        }
        des=nodes[i].descendants
        if (des>0){
        nodes[i].options['Size'] = {
            'value': nodes[i].children.length+" ("+des.toString()+")"
            ,
            'priority': 100
        };
      }
        if (params.hierarchyInfo) {
            nodes[i].options['Layer'] = {
                'value':  nodes[i].generation.toString()
                ,
                'priority': 100
            };

            nodes[i].options['Depth'] = {
                'value': nodes[i].depth.toString() + (" (" + nodes[i].depthGuy + ")" || "")
                ,
                'priority': 100
            };
        }
        nodes[i].infosToDisplay = collectInfos(nodes[i])
    }

    console.log('make index')

    appendDbInfo('Building search Index...')
    makeIndex(nodes)

    let meta_obj={'nodes':nodes,'links':links,'params':params,'idx':idx,'words': data.words || {}}



        focus = params.initialFocus //nodes[1].id
        prevFocus=focus
        nodes[focus].deployedInfos=true
        infosFocus(nodes[focus])
        console.log("focus", focus,params.initialFocus)
    //pour la fonction de recherche
    appendDbInfo('Starting simulation')
    infoDisp()
    init()

    console.log('saving not', wdKey, nodes)
    if (params.saveAllData) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(meta_obj, null, 2)], {
        type: "text/plain"
      }));
      console.log('name', wdKey, name)
      a.setAttribute("download", wdKey + "-rtu-data.json");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      //on calcule les liens visibles et on lance la simulation
      init();
    }

}



function handleClick(event) { //pour la fctn de recherche
    try {
        let term = document.getElementById("myVal").value;
        console.log('go', term)
        if (term.includes(':')){
          if (term.startsWith(':')){
            term=term.replace(':','')
          }
          value=term
        }
        else {
        value= term.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        value=value+' '+(value + '~1')+' '+(value + '*')+' '+('*'+value)
        }
        console.log('value',value)
        let searchResults = idx.search(value).slice(0, maxSearchResults);
        //searchResults = searchResults.concat(idx.search(term + '~1'));
        //searchResults = searchResults.concat(idx.search(term + '*'));
        //searchResults = searchResults.concat(idx.search('*'+term ));

        console.log('done')
        console.log("results", searchResults);
        removeInfos();
        if (searchResults.length > 0) {
            let firstId=searchResults[0].ref
            if (nodes[firstId].hasFeaturedDesc || !params.cleanNonFeatured){
              focus = firstId;
            }
            searchResults.push('useless') //otherwise bug
            for (let i = 0; i < searchResults.length - 1; i++) {
                infos.push(nodes[searchResults[i].ref])
            }
            //infos.push(nodeById(results[1].ref))
            //infos = [,nodeById(results[0].ref)];
            console.log("search", infos)
            //document.getElementById("focus_p").innerHTML = focus;
            init();
        } else {
            console.log('no results')
            infos = [{
                'value': 'no result for '+term,
                'children': []
            }]
        }

        if (largeWidth) {
            infoDisp();
        }
    } catch (error) {
        console.log('search error', error)
    }
    return false;
}

function showParents(n) {
    nodes[n.parentId].show = true;
    if (n.id != 'root') {
        showParents(nodes[n.parentId])
    }
}

function updateVisibleDepth(n) { //used for transparency
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
    for (let k in nodes) {
        nodes[k].prevShow = nodes[k].show; //pour faire popper au bon endroit éventuellement
            nodes[k].highlighted = false
        nodes[k].show = nodes[k].expanded || nodes[nodes[k].parentId].expanded || false;
        nodes[k].visibleDepth = 0;

    }

    //on montre le focuses et ses liens, et leurs parents
    if (focus) {
        let focusedNode = nodes[focus]
        console.log('focus', focus, focusedNode)
        focusedNode.show = true;
        focusedNode.highlighted = true;
        showParents(focusedNode)
        for (let k in focusedNode.linked) {//disabled for now as it makes too many nodes out
            nodes[focusedNode.linked[k]].show = true;
            nodes[focusedNode.linked[k]].highlighted = true;
            console.log(k, 'show focus')
            if (params.alwaysShowParent) {
                showParents(nodes[focusedNode.linked[k]])
            }
        }
        for (let k in focusedNode.children) {//disabled for now as it makes too many nodes out
            nodes[focusedNode.children[k]].highlighted = true;
        }
    }

    let imgCounter = 0;
    for (let id in nodes) {
        if (!nodes[id].hasFeaturedDesc && params.cleanNonFeatured) {
            nodes[id].show = false
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
            nodek.x = nodes[nodek.visibleParentId].x + 350 * (Math.random() - 0.5); //eventuellement allonger si bcp d'enfants
            nodek.y = nodes[nodek.visibleParentId].y + 350 * (Math.random() - 0.5);
            //to put speed at 0: (px=previous x)
            nodek.px = nodek.x;
            nodek.py = nodek.y;
        }
        if (nodek.show) {
            nodes[k].visibleParentId = k
            if (nodek.isLeave || !nodek.expanded) { //si c'est une feuille ou un noeud fermé, marche pas pour focus parent
                updateVisibleDepth(nodek) //on maj toute la hierarchie au dessus
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
    //on retournera une liste synthétique sans répétition ou auto-lien, "metaLinksList"
    //chaque lien meta contient la liste de ses sous liens dans link.links
    let metaLinks = {},
        j = 0;
    for (let k = 0; k < links.length; ++k) {
        numVisibleNodes = (nodes[links[k].source].show ? 1 : 0) + (nodes[links[k].target].show ? 1 : 0)
        if (numVisibleNodes >= params.inheritLinks) { //on modifie les indices des sources pour qu'elles correspondent aux parents visibles
            let visibleSourceIndex = displayedNodesMap[nodes[links[k].source].visibleParentId];
            let visibleTargetIndex = displayedNodesMap[nodes[links[k].target].visibleParentId];
            if ((visibleSourceIndex != visibleTargetIndex)) {

                let linkid = visibleSourceIndex + "|" + visibleTargetIndex;

                //on ajoute a la liste entre ces 2 parents visibles, ou on la créee
                if (linkid in metaLinks) {
                    metaLinks[linkid].type='Multiple links'
                    metaLinks[linkid].links.push(links[k]);
                    } else {
                    metaLinks[linkid] = {
                        source: visibleSourceIndex,
                        target: visibleTargetIndex,
                        links: [links[k]],
                        type: links[k].type
                      };
                    //(j,"lien",k,"de",visibleSourceIndex,"vers",visibleTargetIndex,metaLinks[j],links[k])
                    j = j + 1;
                }
            }
        }
    }
    metaLinksList = []
    for (let l in metaLinks) {
        metaLinksList.push(metaLinks[l])
    }

    return {
        links: metaLinksList,
        nodes: displayedNodes
    }

}


function init() {

    if (force) force.stop(); //useful?
    console.log('init', nodes)
    zoomCounter=0
    if (!nodes[focus]){
      focus=prevFocus
    }
    prevFocus=focus
    //renvoie une liste de noeuds qui ont un id et de liens qui ont une source et une target (entre autres)
    net = visibleNetwork();

    console.log('done', net)
    //removeInfos()?
    //if (adapt) {

    //};


            var force = d3.forceSimulation()
            .nodes(net.nodes)
                .force("link", d3.forceLink(net.links).distance(function(l){
                    //console.log(l.source.id,l.type,l.target.id)
                  return (l.type=='Member of' && !l.source.expanded? 150 : focus==l.source.id || focus==l.target.id ? 200 : height/2 )
                }) .strength(.3))
                  /*.force('cluster', d3.forceCluster().centers(function(d){
                    return d.expanded? d : nodes[d.parentId]
                  }).strength(.1))*/
                .force("collide",d3.forceCollide( function(n){
                  return n.expanded? n.radius*2 : n.radius*1.3
                }).strength(.8).iterations(16) )
                //.force("charge", d3.forceManyBody(function(n){ return -100}))
                .force("center", d3.forceCenter(width / 2, height / 2))

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
        .style("opacity", d => d.parentId == "root" ? 0.1 : d.parentId=='focus'? 1 : Math.min(0.8 , Math.max(0.1, 1 - (nodes[d.parentId].visibleDepth) / 3)))
        //.attr("d", drawCluster)
        .style("stroke-width", "8px")
        .style("stroke", "blue") //d => fill(nodeById(d.parentId).visibleParentId))
        .on("mouseover", function(d) {
            d3.select(this).style("cursor", d=>(focus==d.parentId)?"crosshair":'help')
            //crsrText.text(name(d.parentId))
        })
        .on("click", function(d) {
            if (focus != d.parentId) {
                focus = d.parentId;
                infosFocus(nodes[d.parentId])
                infoDisp();
            } else if (d.parentId != "root") {
                console.log('collapse', d.parentId)
                collapseNode(nodes[d.parentId]);
            }
            init();
        });


    //nodes display-------------------
    if (node) {
        node.remove();
    } //on peut aussi n'enlever que certains noeuds
    //selection des noeuds visibles, avec la classe "node"
    node = nodeg.selectAll(".node").data(net.nodes, d => d.id); //, nodeid);

    //node.exit().remove();
    node=node.enter()
        .append("g")
        .attr("class", "node")
        .style("opacity", nodeOpacity)
        //.attr("display", d => d.id == "root" ? "none" : "block")
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .attr("transform", d => "translate(" + d.x + "," + d.y + ")")
        .on("mouseover", function(d) {
            d3.select(this).style("cursor", d.id === focus ? d.expanded || d.isLeave ? "crosshair" : "col-resize" : "help")
            lightNodeLinks(d, "on")
        }).on("mouseout", function(d) {
            lightNodeLinks(d, "off")
        })
        .on("click", function(d) {
            if (largeWidth) {
                infosFocus(d);
            } //modifie les infos aussi

            if (focus == d.id && !d.isLeave ) {
              proceed=true
            if (d.children.length>80) {
              proceed=window.confirm('It is not recommended to expand a node with so many children, do you wish to continue?')
            }
            if (proceed){
                d.expanded = true;
                if (d.children.length == 0) {
                    removeInfos();
                }
              }
            } else {
                focus = d.id;
            }
            init();
        })

      node.append('pattern')
      .attr("id", d=> "image"+ (d.id.split(' ').join())  )
      .attr("width", 1)
      .attr("height", 1)
               .attr('patternContentUnits', 'objectBoundingBox')
      .append("svg:image")
      .attr("xlink:href", d=>d.img)//function(d) { return d.img;})
                   .attr("height", 1)
                   .attr("width", 1)
                   .attr("preserveAspectRatio", "xMidYMid slice");
      //.attr("width", d=>2*d.radius);


    nodec = node.append("circle")
        .attr("stroke-width", d => d.isLeave ? d.id == focus ? 10 : "3px" : 5 * (Math.sqrt(d.depth)))
        .attr("stroke", d => (d.id === focus) ? "red" : 'white')
        //.style("fill-opacity", d => d.expanded ? 0 : 1)
        .attr("r", d => d.radius)
        .attr("cx", 0)
        .attr("cy", 0)
      .attr("fill",d=> d.imgDisp ?  "url(#image"+ (d.id.split(' ').join()) +")" :  d.expanded ? fill(d.id) : fill(nodes[d.parentId].visibleParentId))


    /*node.append("svg:image")
        .attr("xlink:href", d => d.imgDisp ? d.img : null) //?d.img:"") //function(d) { return d.img;})
        .style("opacity", d => d.visibleDepth > 0 ? d.inheritedPic ? 0 : Math.max(0.1, 1 - d.visibleDepth / 3) : 1) //Math.max(0.1, 1 - d.visibleDepth / 3))
        .attr("x", d => -d.radius) // function(d) { return -25;})
        .attr("y", d => -d.radius) //function(d) { return -25;})
        .attr("height", d => 2 * d.radius)
        .attr("width", d => 2 * d.radius);*/

    //.on("mouseout",d =>  infog.setAttribute("display","none"));

    nodeTextg=node.append('g')
    .attr('transform',d=>'translate(0,'+(d.imgDisp? d.radius:0)+')')

    nodeTextg.append("rect")
        .attr("class", "boxname top")//will contain first name, width is determined later depending on first name
        .attr("rx", 6)
        .attr("ry", 6)

    nodeTextg.append("rect")
        .attr("class", "boxname middle")//contains last name if any
        .attr('display',d=>d.lastName?'block':'none')
        .attr("rx", 6)
        .attr("ry", 6)

    nodeTextg.append("text")
        .attr("x", 0)
        .style("font-family", "American Typewriter, serif")
        .attr("y", 0)//d => d.lastName ? d.imgDisp ?  "2em" : "-1.2em" : d.imgDisp ? "3em" : 0)//d.radius  : -0.6*d.radius : d.imgDisp ? 1.5*d.radius:0)//
        .text(d => d.firstName) //+d.visibleDepth)//+(maxGen-d.generation))
        .each(function(d) {//determines width for bounding white square
            let box = this.parentNode.getBBox();
            d.bb1x = -box.width / 2 - 5;
            d.bb1w = box.width + 10;
        })

    nodeTextg.selectAll(".top")
        //.attr("rx",10)
        .attr("x", d => d.bb1x - 2)
        .attr("y", '-1em')//d => d.imgDisp ? "1em" : "-2em") // -37)
        //.attr("display", d => d.lastName ? "block" : "none")
        .attr("width", d => d.bb1w || 10)
        .attr("height", 21)


    nodeTextg.append("text")
        .style("font-size", "18px")
        .style("font-family", "American Typewriter, serif")
        .attr("x", 0)
        .attr("y", '1em')//d => d.imgDisp ? "3em" : 0)
        .text(d => d.lastName || "")
        .each(function(d) {//determines width for bounding white square
            let box = this.getBBox();
            d.bb2x = -box.width / 2 - 5;
            d.bb2w = box.width + 10;
        })

    nodeTextg
        .selectAll(".middle")
        //.attr("rx",6)
        .attr("x", d => d.lastName ? d.bb2x + 2 : d.bb1x + 2)
        .attr("y", '0em')//d => d.imgDisp ? "2em" : "-1em")
        .attr("width", d => d.lastName ? d.bb2w : d.bb1w)
        .attr("height", 23)

    nodeTextg.append("text")
        .style("font-size", "10px")
        .style("font-family", "American Typewriter, serif")
        .attr("dy", 30)//d=>d.lastName?'3em':'1.5em')//d => d.imgDisp ? "3.8em" : "1.3em")
        .text(d => nodes[d.parentId].shortName)
        //.attr("y", '3em')//d => d.imgDisp ? "3em" : 0)

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


    link=link.enter().append("g")
        .attr("class", "link")
        .attr("transform", d => "translate(" + d.source.x + "," + d.source.y + ")")
        .on("mouseover", function(d) {
            d3.select(this).style("cursor", "help")
            lightLink(d.source.id, d.target.id, "on")
        })
        .on("mouseout", d => lightLink(d.source.id, d.target.id, "off"));

    linkp = link.append("polygon")
        .attr("class", d => ((d.source.id === focus) || (d.target.id === focus)) ? "focus" : "background")
        .attr("stroke", d => ((d.source.id === focus) || (d.target.id === focus)) ? "red" : "grey")
        .attr("opacity", d => ((d.source.id === focus) || (d.target.id === focus)) ? 1 : 0.2)
        .attr("points", function(d) {
            let dx = d.target.x - d.source.x;
            let dy = d.target.y - d.source.y;
            return "0 0 " + dx + " " + dy
        })
        //.attr("display", d => d.options.type === "Member of" ? "block" : "block")
        .style("stroke-width", d => linksWidth[d.type||'default'])
        .on("click", function(d) {
            focus = (focus==d.source.id)? focus=d.target.id : focus=d.source.id;
            if (largeWidth) {
                removeInfos();
                infos = [d, {
                    type: "Links",
                    value: word(d, "Links"),
                    "off": 10,
                    "deployedInfos": true //sert à savoir si l'info est déployée (non par défaut)
                }]
                infosFocus(d)
                infoDisp();
                init()
            }
        });

    link.sort(linkSort)


    //Force updates------------------------------

    //node.call(force.drag);

    force.on("tick", function(e) {
        if (force.alpha()<.7){
          force.stop()
          return
        }
        console.log(force.alpha())
        if (!hull.empty()) {
            hull.data(convexHulls(net.nodes, off))
                .attr("d", drawCluster);
        }

        let minY = net.nodes.reduce((min, p) => p.y < min ? p.y : min, net.nodes[0].y);
        let maxX = net.nodes.reduce((max, p) => p.x > max ? p.x : max, net.nodes[0].x); //unused
        let minX = net.nodes.reduce((min, p) => p.x < min ? p.x : min, net.nodes[0].x);

        //var focusDeltaX = nodes[focus].x-globalCenter.x*scaleFactor/10
        //var focusDeltaY = nodes[focus].y-transCorrectenter.y*scaleFactor^2/2
        //console.log('foc',nodes[focus].x,focusDeltaX,globalCenter.x*scaleFactor/10)
        //evolution des noeuds en les ramenant dans le cadre
        /*node
        .each(collide(e.alpha/4))
        .each(function(d) {
            d.x=d.x-e.alpha*nodes[focus].x
            d.y=d.y-e.alpha*nodes[focus].y
            d.x = minX < 100 ? d.x + 50 * e.alpha : d.x //:d.x>width?d.x-d.x+100*e.alpha:d.x;
            d.y = minY < 0 ? d.y + 50 * e.alpha : d.y;
        })*/
        node.attr("transform", d => "translate(" + (d.x) + "," + (d.y) + ")");

        //Evolution des liens et de leurs enveloppes
        link.attr("transform", d => "translate(" + (d.source.x) + "," + (d.source.y) + ")")
        linkp.attr("points", function(d) {
            let dx = (d.target.x) - (d.source.x);
            let dy = (d.target.y) - (d.source.y);
            return "0 0 " + dx + " " + dy
        })


    });

adaptZoom()


}

function collide(alpha) {
  var maxRadius=100
  var padding=150
  var quadtree = d3.geom.quadtree(net.nodes);
  return function(d) {
    if (d.id==focus){
      return
    }
    var r = d.radius + maxRadius + padding,
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d) ) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            focusFactor=(quad.point.id==focus)?1:0
            r = ((2+2*focusFactor)*d.radius + quad.point.radius + padding+(d.parentId==quad.point.parentId?0:200))*(1+focusFactor);
        if (l < r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          if (quad.point.id != focus){
          quad.point.x += x;
          quad.point.y += y;
        }
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}

/*function linkid(l) {
let u = nodeid(l.source),
v = nodeid(l.target);
return u<v ? u+"|"+v : v+"|"+u;
}*/


function infoDisp()
{
    //lit l'info de d et affiche les infos correspondantes
    infoWidth = 300;
    //on enleve tout
    infoG.selectAll(".infoblock").remove()
    let off = 10;
    //sert à mettre la croix de fermeture
    let firstBlock = true;
    //sert à savoir si on affiche le prochain subblock
    let displaySubBlocks = true;

    let counter=0
    for (let i in infos)
    {
      counter++

      //TODO:infos contient plusieurs éléments, chaque élément représente un bloc qui peut éventuellement se déployer
        let d = infos[i] //node or link or custom
        let prevHeight = infog.getBBox().height + 5;

        //cadre titre
        let info = infoG.append("g")
            .data([d])
            .attr("class", "infoblock")
            .attr("transform", "translate(" + (d.off || off) + "," + prevHeight + ")")

            if (counter>params.infoMax){
              break}
        //rectangle du cadre titre
        info.append("rect")
            .data([d]).attr("fill", d => fill(d.id) || 'lightblue')
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
            .on("mouseover", function(d) {
                d3.select(this).style("cursor", "pointer")
                //crsrText.text(name(d.parentId))
            })
            .on("click", function(d) {
                d.deployedInfos = !d.deployedInfos;
                infoDisp()
            })

        if (firstBlock) {
            //croix de fermeture
            let closeBox = info.append("g")
                .attr("transform", "translate(" + infoWidth + ",1)")
                .attr("display", firstBlock ? "block" : "none")
                .on("click", removeInfos)
                .on("mouseover", function(d) {
                    d3.select(this).style("cursor", "pointer")
                    //crsrText.text(name(d.parentId))
                })
            closeBox.append("circle")
                .attr("cx", -28)
                .attr("radius", 28)
                //.attr("width", 28)
                .attr("fill", "white")
            //.attr("rx", 5)

            closeBox.append("text")
                .attr("x", -27)
                .attr("y", 23)
                .attr("font-size", 26)
                .text("\u2573" || "X")
        }
        firstBlock = false;


        if (d.type === "Links" || d.type === "Contains") {
            displaySubBlocks = d.deployedInfos

            info.append("text")
                .text(word({}, d.value||d))
                .attr("x", 31)
                .attr("y", 20)
                .attr("font-size", 16)

            off = 20;
        } else if (displaySubBlocks) {
            //transform result en [key,value]

            let result = d.infosToDisplay || [];

            //titre
            info.append("text")
                .text(d.id ?
                    nodes[d.id].shortName //node
                    :
                    d.source ? //link
                    d.source.id ? //ca peut etre le noeud (auquel car il a un id) ou juste son nom
                    nodes[d.source.id].shortName + (" \u21E8 " || " -> ") + nodes[d.target.id].shortName :
                    nodes[d.source].shortName + (" \u21E8 " || " -> ") + nodes[d.target].shortName :
                    d.value) //texte
                //.attr("font-family","American Typewriter")
                .attr("font-size", d.source ? 10 : 15)
                .attr("x", 30)
                .attr("y", 20)
                .on("mouseover", function(d) {
                    d3.select(this).style("cursor", "pointer")
                    //crsrText.text(name(d.parentId))
                })
                .on("click", function(d) {
                    console.log('clictext')
                    //on range l'ancien focus, sauf si on clique sur un noeud déballé
                    infosFocus(d);
                    if (d.hasFeaturedDesc || !params.cleanNonFeatured) {
                      focus = d.id;
                      init();
                    }
                })

            let bckgrdRect = info.append("rect")
                .attr("fill", d => fill(d.id) || 'lightblue')
                .attr("y", 30)
                .attr("height", 0)
                .attr("width", infoWidth)
                .style("opacity", .8)


            let infoSubBlock = info.append("text")
                .attr("display", d.deployedInfos ? "block" : "none")
                //.attr("y",100)
                .attr("transform", d => "translate(0," + (d.img ? params.imgHeights : 0) + ")")
                .selectAll(".smalltext")
                .data(result)
                .enter()


            //img eventuelle
            let imgInfo = info.append("svg:image")
                .attr("display", d => (d.img && d.deployedInfos) ? "block" : "none")
                .attr("xlink:href", d => d.img) //?d.img:"") //function(d) { return d.img;})
                .attr("x", 30) //infoWidth/2-50)//d=>-d.radius)// function(d) { return -25;})
                .attr("y", "3em") //d=>-d.radius)//function(d) { return -25;})
                .attr("height", params.imgHeights)
                .attr("width", 230)//params.imgHeights+"px")
                //.attr("preserveAspectRatio", "xMidYMid slice");
            //.attr("width",100);

            //on met a jour la hauteur du bloc au fur et a mesure
            let blockHeight = 48;
            //on met les textes avant les titres pour calculer la hauteur du bloc au passage
            infoSubBlock
                .append("tspan")
                .filter(d => d.title)
                .attr("class", "smalltext")
                .attr("y", function(d) {
                    d.height = blockHeight;
                    //console.log('ayyyyy', d)
                    //calcul approximatif de la hauteur du texte une fois formatté, en fonction du nombre de lettres
                    blockHeight = blockHeight + infoTextSize * Math.floor(3 + .55 * d.value.length * infoTextSize / infoWidth*1.2);
                    return d.height+15
                })
                .text(d => d.value)
                .attr("font-size", infoTextSize)
                .each(wrapText)
                //on saute une ligne à la fin
                .append("tspan")
                .text("   ")
                .attr("dy", 20);

            //on place les titres
            infoSubBlock
                .append("tspan")
                .filter(d => d.title)
                .text(d => d.title)
                .attr("stroke", "green")
                .attr("stroke-width", .5)
                .attr("font-size", 16)
                .attr("y", d => d.height) //calculé dans le bloc d'avant
                .attr("x", 0)
                .append("a")
                .attr("href", d =>  d.url)
                .attr("target", "_blank")
                .text(d => d.url ? " (source " + d.source + ")" :
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


function wrapText(){
  let counter=1
  var text = d3.select(this),
        wordings = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy"))||0,
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em")
    while (word = wordings.pop()) {
      line.push(word)
      tspan.text(line.join(" "))
      if (tspan.node().getComputedTextLength() > infoWidth*.9) {
        line.pop()
        tspan.text(line.join(" "))
        line = [word]
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", 18*counter).text(word)
        counter++
      }
    }
}

function collectInfos(d) {
    if (d.noInfoDisplay) {
        return [{}]
    }
    //returns array [['info','value'],['info':'value'],...]
    //textwrap bug et n'affiche pas la 1re info donc je mets une info vide pour contrer ça
    let result = [{}];
    if (d.type) {
        result.push({
            'title': 'type',
            'value': word(d, d.type),
            'priority': 0.1
        })
    } else {//node

        if (d.linked && d.linked.length > 0) {
            //maybe problem because linked contains objects now, not just ids
            result.push({
                'title': word(d, "Links with"),
                'value': d.linked.map(id => nodes[id].name).join(', '),
                'priority': 100
            })
        }

    }
    if (d.options) {
        //entries=Object.entries(d.options)
        for (let e in d.options) {

            option = d.options[e]
            if (!option.value){
              if (option.source){
                option.value=option.source
              }else{
                option={'value':option}
            }
            }
            option.title=word(d,e)
            if (typeof(option.value)=='object') {//concat set elements
                values=[]
                console.log(d,option)
                option.value.forEach(function(s){
                  let t=nodes[s]?nodes[s].shortName:word(d,s)||s
                  values.push(t)
                })

                option.value=values.join(', ')
            }
            if (option.value) {
              result.push(option) //{'title':word(d,d.options[e].title),'value':word(d,d.options[e].value),'priority':d.options[e].priority})
        }
      }
    }
    result.sort(prioSort)//problem with undef priorities
    return result
}

function prioSort(o1,o2){//large priority = ranked last
  p1=('priority' in o1)?o1.priority:100
  p2=('priority' in o2)?o2.priority:100
  return   p1-p2
}


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


function infosFocus(d) {//adds node/link d and its children/links to 'infos'
    console.log('infosfocus prime')
    //si l'info du noeud n'est pas déjà affichée, on l'affiche, avec ses enfants et ses liens
    //if (infos[0] != d) {
    removeInfos();
    d.deployedInfos = true;
    infos = [d]

    if (d.children?.length > 0) {
        infos.push({
            type: "Contains",
            value: word(d, "Contains"),
            "off": 10,
            "deployedInfos": true
        })

        infoDisp();
        d.children.forEach(function(c){
          infos.push(nodes[c])
        }

      )
    }


    if ('links' in d && d.links.length > 0) {
        infos.push({
            type:'Links',
            value: word(d,"Links"),
            "off": 10,
            "deployedInfos": true
        })

        infos = infos.concat(d.links)
    }

    infoDisp();
    //} else if (d.children.length === 0) {
    //  removeInfos()
    //}

}

function nodeOpacity(d){
  return d.id == "root" ? 0.1 : d.highlighted? 1 : .1//Math.max(0.1,Math.min(0.3, 1 - (d.visibleDepth+2) / 3))
}

function lightNode(id, p) {
    nodec.filter(d => (d.id === id)).attr("stroke", d => d.id == focus ? "red" : p === "on" ? "orange" : "white")
        nodeTextg.attr("stroke-width",  0)
        node.filter(d => (d.id === id)).style("opacity", d=> p=="on"? 1 : nodeOpacity(d))
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
function convexHulls(nodeGrp, offset) { //nodegrp: liste de noeuds
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
        for (let z in cr) { //je ne sais pas pourquoi mais concat ne marche pas...erreur dans la couleur du hull
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

    //if (dictNodes [ 23 ] .show) {a = bbb;}//23 4

    return hullset;
}

function drawCluster(d) {
    return curve(d.path); // 0.8
}

function word(d, s) {
  //console.log('translation'+s,d.id,d,'words' in d && s in d.words,('words' in d && s in d.words)?d.words[s]:'no')
    s=s?s.toString():''
    return ('words' in d && s in d.words) ? d.words[s] : (s in words) ? words[s] : s in nodes ? nodes[s].shortName : s ||''

}

function shorten(s) {
  return s.length>32? s.substring(0,25)+"..." : s
}
