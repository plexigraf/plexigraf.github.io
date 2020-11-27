
//Data instructions
//list of entries, pour chaque entrée 2 choix
//1-un noeud:
//last name: nom le plus important (pour la fonction recherche)
//first name: autre partie du nom
//Id: identification du nom (unique)
//parentId: Id du parent, "root" s'il n'y a pas de parent (obligatoire)
//params: liste d'entré de la forme
// {key: {'texte':string, 'ur': string (optionnal), 'source': string (optionnel)}}
//link(s) optionnel liste de liens de la forme
//
//2-un lien auquel cas l'entrée est "link": {...}
//"source" : "",
//       "targetName" : "",
//       "target" : "",obligatoire
//       "targetParentId" : "",obligatoire si target n'existe pas encore
//       "otherParents" : "",
//       "params" :
//

//TO DO determiner pourquio ca rame sous philippeII et pas animalia
//TO DO quand on clique sur une feuille, il faudrait qu'elle se rentre, et enlever l'info
//remettre le focus en rouge

//TO DO:   changer polices, prendre en compte plusieurs parents, utiliser hierarchy package,
//
//  faire drag noeuds et zoom texte sans propagation


//idees taxo:
// ameliorer forme conv hull pour gros noeuds
//faire une force pour que les cercles reels ne se superposent pas, meme déployés?
//force pas trs bien centrée...
//la transparence d'un noeud déployé ne devraient dépendre que des sous noeuds déplyés qui sont visibles
//Faire mieux apparaitre nom et contour de noeuds déployés, qu'ils gardent un noyau dur
//ne pas refaire le zoom a chaque fois
//faire un zoom sur le focus qui ignore le reste
//faire dependre linkwidth de la taille, ou autre...
//pour les positions initiales, faire dans l'ordre ascendant pour pas être trop le bordel



//dans l'info:
//possibilité de fermer un hull/noeud depuis l'info
//chaque nom, noeud, etc...rencontré dans les infos doit être cliquable
//rajouter filiation dans les infos
//possibilité de naviger dans les infos des briques, sous briques etc...

const chartDiv = document.getElementById("mainchart");

//const filename = "taxo-graph.json"//"taxo-graph.json"
//const filename = "Philippe-II-2018.json"//"taxo-graph.json"
let params={ belongsToLinkWidth:1,
            screenRatio:4/5,
            zoomFactor:1.3,//plus c'est petit plus le graphe apparaitra grand
            dr : 44, // default point radius
            alwaysShowParent : true,// dès qu'un noeud sort tous ses ancetres également
            initialFocus:'',
            expand_first_n_gens:2,
            hierarchyInfo: true
            //initialFocus;undef by default
    },
//const filename = "taxo-graph.json"
    focus,
    divName = "body",
    width = params.screenRatio*window.screen.width, // svg width
    height = width, // svg height
    largeWidth = chartDiv.offsetWidth > 600,//permet d'afficher les infos
    off = params.dr;
        //liste de toutes entrées de la DB, ce sera également les noeuds du graphe?
let nodes = [];
    //tous les liens de la DB, y compris parenté, remplacé par metaLinks pour le tracé
let links = [];
    //"name" -> number
let nodesMap = {};
    //liste des infos à afficher, de la forme {key:value}
let infos = [];
let infoWidth = 0;//varie en fonction de info/removeInfos
let infoTextSize = 14;
    //variable contenant nodes et links utilisé par D3 pour tracer
let maxGen=0;
let net;
let force,  link, linkp, node, nodec;

curve = d3.svg.line()
    .interpolate("cardinal-closed")
    .tension(.85)


//document.getElementById("focus_p").innerHTML = focus

const fill = d3.scale.category20();
// --------------------------------------------------------

let idx = 'idx undef yet';

//$.getJSON(filename, function(json) {
function makeIndex(entries) {
    idx = lunr(function () {
        this.ref('id')
        this.field('name',
            {boost: 10}
        )
        this.field('strParams')

        entries.forEach(function (entry) {
            entry.strParams = JSON.stringify(entry.params)
            this.add(entry)
        }, this)
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
    let autoZoom = (width - 100) / (200 * (infoWidth / 150 + Math.sqrt(net.nodes.length) + 1))/params.zoomFactor

    //on recale le canvas a gauche du texte, le graphe est censé translater tout seul via une force spécifique
    vis.transition().duration(2000).call(zoom.translate([infoWidth + 100, 100]).scale(autoZoom).event);
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
function name(nodeId) {

    let node = nodeById(nodeId);
    return node.name;
}
//return nodes[nodesMap[id]]
function nodeById(id) {
    return nodes[nodesMap[id]]
}

function computeGen(n){
    for (let i in n.children){
        n.children[i].generation=n.generation+1
        maxGen=Math.max(maxGen,n.generation+1)
        computeGen(n.children[i])
    }
    if (n.generation<params.expand_first_n_gens) {
        n.expanded = true
    }
}

//construit nodes et links à partir de données json
function buildNodesLinks(data){
    keys=Object.keys(data.params)
    for (let k in keys){
        params[keys[k]]=data.params[keys[k]]
    }
    console.log('data',data)

    //empty children linked links, initial x y random, deployedInfos prevshow=false
    function initialise(n) {
        if (n.name){

            names=n.name.split(' ')
            n.firstName=names.shift()
            if (names.length>0){
                n.lastName=names.join(' ')
            }
        }
        else {
            n.name=n.firstName+' '+n.lastName || n.firstName || n.lastName
        }
        n.children = [];
        n.x = 100 + width * Math.random();
        n.y = 300 * Math.random();
        n.px = n.x
        n.py = n.y;
        n.prevShow = false;
        n.linked = [];
        n.links = [];
        n.deployedInfos = false;//détermine si l'info est déployée (non par défaut)
        n.visibleParentIndex = nodes.length;
        n.expanded = n.expanded || false;//pas développé par défaut
        n.isLeave=false//feuilles de l'arbre = pas d'enfant
        n.generation=0
        n.visibleDepth=0
        return n;
    }

    //extract nodes
    for (let i = 0; i < data.nodes.length; ++i) {
        let nodei = data.nodes[i];
            if (nodei.id != "" && nodei.hide != "yes") { //hide = does not exist in the visualisation
                nodesMap[nodei.id] = nodes.length; //0 au début, grandit au fur et à mesure
                nodei = initialise(nodei) //initialise pour l'affichage
                nodes.push(nodei)


        }

    }

    makeIndex(nodes)//pour la fonction de recherche

    focus=params.initialFocus//nodes[1].id
    console.log("focus",focus)
    let createOrphans=false;
    //on met les orphelins a la DASS on calcule les tailles au passage
    for (let i = 0; i < nodes.length; ++i) {
        nodei=nodes[i]
        if (nodesMap[nodei.parentId] == undefined){
            createOrphans=true;
            nodei.parentId="orphans"
        }
        //on ajoute les liens de parenté
        links.push({
            source: nodei.id,
            target: nodei.parentId,
            params: {
                'type': "belongsTo"
            }

        });
    }

    if (createOrphans){
        nodesMap['orphans'] = nodes.length; //0 au début, grandit au fur et à mesure
        orph = initialise({'id':'orphans','parentId':'root','expanded':false,'name':'Orphans'}) //initialise pour l'affichage
        nodes.push(orph)

        links.push({
            source: 'orphans',
            target: 'root',
            params: {
                'type': "belongsTo"
            }

        });
    }


    console.log(nodes)
    nodes[0].expanded = true;


    //build children lists and links
    console.log(nodesMap)
    for (let i = 1; i < nodes.length; ++i) {
        let nodei = nodes[i];
        parent = nodeById(nodei.parentId)
        nodei.show = parent.expanded;
        parent.children.push(nodei);
    }


    console.log("gen",nodes[0])
    computeGen(nodes[0])


    //extract links
    for (let i = 0; i < data.links.length; i++) {
        //il y a des checks a faire ici...
        let linki = data.links[i] || { target: "" };
        //target required
        if (linki.target != "") {
            links.push(linki)
            //on verifie que parent existe, ou target Parent
            if (nodesMap[linki.target]) {
            }
            //s'il n'existe pas on est censes le creer comme enfant de "targetParentId"
            else if (linki.targetParentId) {
                //("création de ",linki.targetName);
                nodesMap[linki.target] = nodes.length;
                let tgtName = linki.targetName;
                let nodei = {
                    id: linki.target,
                    //il peut y avoir plusieurs last names
                    name:  tgtName,
                    parentId: linki.targetParentId,
                    expanded: false,
                    params: {},
                    poste: ""
                }
                nodei=initialise(nodei)
                nodes.push(nodei);
                links.push({
                    source: linki.target,
                    target: linki.targetParentId,
                    params: {
                        'type': "belongsTo"
                    }
                });

            } else {
                console.log("target inconnu", linki.parentId);
                a = bb;
            }

            //pour chaque noeud on a la liste "linked", qui contient les noeuds avec lesquels il est lié, et une liste "links", qui contient les liens eux-mêmes
            nodeById(linki.source).linked.push(nodeById(linki.target));
            nodeById(linki.target).linked.push(nodeById(linki.source));
            nodeById(linki.source).links.push(linki);
            nodeById(linki.target).links.push(linki);
        }
    }

    //on calcule la taille de chacun, y compris noeuds nouvellement créés

    for (let i = 0; i < nodes.length; ++i) {
        nodes[i].descendants=size(nodes[i])-1
        nodes[i].radius=params.dr+Math.sqrt(nodes[i].descendants)
        nodes[i].depth=depth(nodes[i])
        nodes[i].isLeave = (nodes[i].children.length==0)//feuille de l'arbre = pas d'enfants
        if (params.hierarchyInfo){
            nodes[i].params['Layer']={'texte':nodes[i].generation.toString()},
            nodes[i].params['Descendants']={'texte':nodes[i].descendants.toString()}
        }
    }

    document.getElementById("processing").innerHTML="";

}

//lance la simu
d3.json(filename, function(error, json) {
    if (error) throw error;
    buildNodesLinks(json)

    //on calcule les liens visibles et on lance la simulation
    init(true);

    //effet "apparition progressive"
    /*vis.attr("opacity", 1e-6)
        .transition()
        .duration(3000)
        .attr("opacity", 1);*///empêche le zoom initial... :(


});


function handleClick(event) { //pour la fctn de recherche

    let term = document.getElementById("myVal").value;
    console.log('go',term)
    let results = idx.search(term);
    console.log('done')
    console.log("results",results);
    removeInfos();
    if (results.length>0) {
        focus = results[0].ref;
        results.push('useless')
        for (let i = 0; i < results.length - 1; i++) {
            console.log("result", i, results[i])
            infos.push(nodeById(results[i].ref))
        }
        //infos.push(nodeById(results[1].ref))
        //infos = [,nodeById(results[0].ref)];
        console.log("search", infos)
        //document.getElementById("focus_p").innerHTML = focus;
        init(false);
    } else {
        console.log('no results')
        infos=[{'texte':'Pas de résultats','children':[]}]
    }

    if (largeWidth) { infoDisp();}
    return false;

}

function showParents(n){
    parentIndex=nodesMap[n.parentId]
    if (nodes[parentIndex].show || n.parentId=="root"){
        return
    }else{
        nodes[parentIndex].show=true;
        showParents(nodes[parentIndex])
    }
}

function updateVisibleDepth(n){//used for transparency
    if (n.id=="root"){
        return
    }
    parentIndex=nodesMap[n.parentId]
    if (nodes[parentIndex].visibleDepth <= n.visibleDepth) {
        nodes[parentIndex].visibleDepth = n.visibleDepth+1
        updateVisibleDepth(nodes[parentIndex])
    }
}

//calcule les nodes pour qui show=true et un seul lien max entre chaque paire affichée (=metalien)
//détermine visibleParentIndex et emplacement des nouveaux
//renvoie les noeuds et metaliens a afficher
function visibleNetwork() {
    //règles:
    //-si un noeud a son parent expanded=true, on le montre (show=true)
    //-si un noeud est focused, ou s'il est lié à un focused, on le montre
    //-si alwaysShowParent: si un noeud a show=true, on montre son parent
    //fonctionnement: user définit expanded et focus, show est calculé par le programme en fctn des règles
    //a faire:
    //0-faire une liste (displayedNodes?) de tous les noeuds à montrer (focus, linked to focus, parents?, son of expand)
    // 4-calculer visibleParentIndex de chacun si besoin, et leur nouvelle position si show=false
    //n-mettre show=true

    //noeuds à afficher. Correspond à show=true?

    //on montre les noeuds expanded ou dont le parent expanded
    for (let k = 0; k < nodes.length; ++k) {
        nodes[k].prevShow = nodes[k].show;//pour faire popper au bon endroit éventuellement
        nodes[k].show = nodes[k].expanded || nodeById(nodes[k].parentId).expanded || false;
        nodes[k].visibleDepth=0;
    }

    //on montre le focuses et ses liens, et leurs parents
    if (focus) {
        focusedNode = nodeById(focus)
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
    nodes[0].visibleParentIndex = 0;

    //on determine le parent visible de chacun, même les noeuds cachés, pour faire les méta-liens
    //et pour déterminer les coodronnées initiales
    for (let k = 1; k < nodes.length; ++k) {
        let nodek = nodes[k];
        if (nodek.show){
            nodes[k].visibleParentIndex=k
            if (nodek.isLeave || !nodek.expanded){//si c'est une feuille ou un noeud fermé
                updateVisibleDepth(nodek)//on maj toute la hierarchie au dessus
            }
        }
        else
            {
        let looking = true;
        let current = k;

        while (looking) {
            let crtNode = nodes[current];
            let parentIndex = nodesMap[crtNode.parentId];
            if (crtNode.show === false) { //si le noeud est caché
                //on va regarder si son parent est visible
                current = parentIndex;
            } else {
                //crtNode est le visibleParentIndex
                if (nodek.show != nodek.prevShow) {
                    //just popped
                    nodek.prevShow = true;
                    //on les fait apparaitre pres de leur visibleParentIndex
                    nodek.x = nodes[nodek.visibleParentIndex].x + 350 * Math.random();
                    nodek.y = nodes[nodek.visibleParentIndex].y + 350 * Math.random();
                    //to put speed at 0: (px=previous x)
                    nodek.px = nodek.x;
                    nodek.py = nodek.y;
                    }

                looking = false;

                //cet attribut servira plus tard pour l'affichage des couleurs et des enveloppes
                nodek.visibleParentIndex = current;


            }
        }
        }
    }

    let displayedNodes = [],
        displayedNodesMap = [],
        i = 0;
    for (let k = 0; k < nodes.length; ++k) {

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
        let visibleSourceIndex = displayedNodesMap[nodeById(links[k].source).visibleParentIndex];
        let visibleTargetIndex = displayedNodesMap[nodeById(links[k].target).visibleParentIndex];
        if ((visibleSourceIndex != visibleTargetIndex) && (visibleTargetIndex!=0)) {

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
    console.log('init')
    //renvoie une liste de noeuds qui ont un id et de liens qui ont une source et une target (entre autres)
    net = visibleNetwork();
    //removeInfos()?
    //if (adapt) {
        adaptZoom()
    //};



    force = d3.layout.force()
        .nodes(net.nodes)
        .links(net.links)
        .size([width / 2, height / 2])
        //.linkDistance(function(l, i) { return 600; })
        .linkStrength(function(l, i) {
            return ((l.source.id === focus) || (l.target.id === focus) || (l.params.type === "belongsTo")) ? .3 : 0.1;
        })
        .charge(function(n, i) {
            return (n.id === focus ? -8000:-6000);//-200*n.radius : -150*n.radius);
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
        .style("fill", d => fill(nodeById(d.parentId).visibleParentIndex))
        .style("opacity", d => d.parentId=="root"? 0 : Math.max(0.1,1 - nodeById(d.parentId).visibleDepth/ 3))
        //.attr("d", drawCluster)
        .style("stroke-width", "8px")
        .style("stroke", "blue")//d => fill(nodeById(d.parentId).visibleParentIndex))
        .on("mouseover", function(d) {
            d3.select(this).style("cursor", "crosshair")
            //crsrText.text(name(d.parentId))
        })
        .on("click", function(d) {
            if (d.parentId != "root") {
                focus = d.parentId;
                collapseNode(nodeById(d.parentId));
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
        .attr("display",d=>d.id=="root"? "none":"block")
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .attr("transform", d => "translate(" + d.x + "," + d.y + ")")
        .on("mouseover", function(d) {
            d3.select(this).style("cursor", d.id === focus ? d.expanded ? "crosshair" : "col-resize" : "help")
            lightNodeLinks(d, "on")
        }).on("mouseout", function(d) {
            console.log('mouseout')
            lightNodeLinks(d, "off")
        })
        .on("click", function(d) {

            if (largeWidth) { infosFocus(focus, d);}//modifie les infos aussi
            if (focus==d.id){
                d.expanded=true;
                if (d.children.length==0){
                    removeInfos();
                }
            }else {
                focus = d.id;
            }
            init(false);
        })

    nodec = node.append("circle")
        .attr("stroke-width", d=>d.isLeave? d.id==focus? 10 : "1px" : 5*(d.depth))
        .style("opacity", d =>  d.id=="root"? 0:  Math.max(0.1,1 - d.visibleDepth / 3))
        .attr("stroke", d =>(d.id === focus) ? "red" :  'lightgrey')
        //.style("fill-opacity", d => d.expanded ? 0 : 1)
        .attr("r", d => d.radius)
        .attr("cx", 0)
        .attr("cy", 0)
        .style("fill", d => d.expanded ? fill(nodesMap[d.id]) : fill(nodeById(d.parentId).visibleParentIndex))



    //.on("mouseout",d =>  infog.setAttribute("display","none"));

    node.append("rect")
        .attr("class", "boxname top")


    //rectangles avec nom sur chaque noeud
    node.append("rect")
        .attr("class", "boxname middle")

    node.append("text")
        .attr("x", 0)
        .style("font-family", "American Typewriter, serif")
        .attr("y", d => d.lastName ? "-1.2em" : 0)
        .text(d => d.firstName)//+d.visibleDepth)//+(maxGen-d.generation))
        .each(function(d) {
            let box = this.parentNode.getBBox();
            d.bb1x = -box.width / 2 - 5;
            d.bb1w = box.width + 10;
        })

    node.selectAll(".top")
        //.attr("rx",10)
        .attr("x", d => d.bb1x - 2)
        .attr("y", -37)
        .attr("display", d => d.lastName ? "block" : "none")
        .attr("width", d => d.bb1w || 10)
        .attr("height", 21)


    node.append("text")
        .style("font-size", "18px")
        .style("font-family", "American Typewriter, serif")
        .attr("x", 0)
        .attr("y", 0)
        .text(d => d.lastName || "")
        .each(function(d) {
            let box = this.getBBox();
            d.bb2x = -box.width / 2 - 5;
            d.bb2w = box.width + 10;
        })


    node
        .selectAll(".middle")
        //.attr("rx",6)
        .attr("x", d => d.lastName ? d.bb2x + 2 : d.bb1x + 2)
        .attr("y", -14)
        .attr("width", d => d.lastName ? d.bb2w : d.bb1w)
        .attr("height", 23)

    node.append("text")
        .style("font-size", "10px")
        .style("font-family", "American Typewriter, serif")
        .attr("dy", "2em")
        .text(d => name(d.parentId))

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
        //.attr("display", d => d.params.type === "belongsTo" ? "block" : "block")
        .style("stroke-width", d => d.params.type === "belongsTo" ? params.belongsToLinkWidth : 10)
        .on("click", function(d) {
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

    force.on("tick", function(e) {
        if (!hull.empty()) {
            hull.data(convexHulls(net.nodes,  off))
                .attr("d", drawCluster);
        }

        let minY = net.nodes.reduce((min, p) => p.y < min ? p.y : min, net.nodes[0].y);
        let maxX = net.nodes.reduce((max, p) => p.x > max ? p.x : max, net.nodes[0].x);//unused
        let minX = net.nodes.reduce((min, p) => p.x < min ? p.x : min, net.nodes[0].x);

        let left = 300;
        let middle = (width + left) / 2//unused

        //evolution des noeuds en les ramenant dans le cadre
        node.each(function(d) {
            d.x = minX < 100 ? d.x + 50 * e.alpha : d.x //:d.x>width?d.x-d.x+100*e.alpha:d.x;
            d.y = minY < 0 ? d.y + 50 * e.alpha : d.y;
        })
        node.attr("transform", d => "translate(" + (d.x) + "," + (d.y) + ")");

        //Evolution des liens et de leurs enveloppes
        link.attr("transform", d => "translate(" + (d.source.x) + "," + (d.source.y) + ")")
        linkp.attr("points", function(d) {
            let dx = (d.target.x) - (d.source.x);
            let dy = (d.target.y) - (d.source.y);
            return "0 0 " + dx + " " + dy
        })




    });

}




/*function linkid(l) {
  let u = nodeid(l.source),
  v = nodeid(l.target);
  return u<v ? u+"|"+v : v+"|"+u;
}*/








function infoDisp() {
    //lit l'info de d et affiche les infos correspondantes
    infoWidth=300;
    //on enleve tout
    infoG.selectAll(".infoblock").remove()
    let off = 10;
    //sert à mettre la croix de fermeture
    let firstBlock = true;
    //sert à savoir si on affiche le prochain subblock
    let displaySubBlocks = true;

    for (let i in infos) {
        let d = infos[i]
        let prevHeight =   infog.getBBox().height + 5;

        //cadre titre
        let info = infoG.append("g")
            .data([d])
            .attr("class", "infoblock")
            .attr("transform", "translate(" + (d.off || off) + "," + prevHeight + ")")

        //rectangle du cadre titre
        info.append("rect")
            .data([d]).attr("fill", "lightblue")
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
                for (i in d.subLinks) {
                    fromField = fromField + (i == 0 ? "" : ", ") + name(d.subLinks[i].source);
                    toField = toField + (i == 0 ? "" : ", ") + name(d.subLinks[i].target);
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
                        "texte": d.linked.map(n => name(n.id)).join()
                    }])
                }

            }
            if (d.params) {
                result = result.concat(Object.entries(d.params))
            }

            //titre
            info.append("text")
                .text(d.id ? name(d.id) : d.source? d.source.id ? name(d.source.id) + (" \u2b0c " || " <-> ") + name(d.target.id) : name(d.source) + (" \u2b0c " || " <-> ") + name(d.target):d.texte)
                //.attr("font-family","American Typewriter")
                .attr("font-size", d.source ? 10 : 15)
                .attr("x", 30)
                .attr("y", 20)
                .on("mouseover", function(d) {
                    d3.select(this).style("cursor", "pointer")
                    //crsrText.text(name(d.parentId))
                })
                .on("click", function(d) {
                    //on range l'ancien focus, sauf si on clique sur un noeud déballé
                    infosFocus(focus, d);
                    focus = d.id;
                    init(false);
                })

            let bckgrdRect = info.append("rect")
                .attr("fill", "lightblue")
                .attr("y", 30)
                .attr("height", 0)
                .attr("width", infoWidth)
                .style("opacity", .8)


            let infoSubBlock = info.append("text")
                .attr("display", d.deployedInfos ? "block" : "none")
                .selectAll(".smalltext")
                .data(result)
                .enter()

            //on met a jour la hauteur du bloc au fur et a mesure
            let blockHeight = 48;
            //on met les textes avant les titres pour calculer la hauteur du bloc au passage
            infoSubBlock
                .append("tspan")
                .filter(d => d[1].texte)
                .attr("class", "smalltext")
                .attr("y", function(d) {
                    d.height = blockHeight;
                    //calcul approximatif de la hauteur du texte une fois formatté
                    blockHeight = blockHeight + infoTextSize * Math.floor(3 + .55 * d[1].texte.length * infoTextSize / infoWidth);
                    return d.height
                })
                .text(d => d[1].texte)
                .attr("font-size", infoTextSize)
                .each(function() {
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
            let newHeight =   infog.getBBox().height - 25 - prevHeight;
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
    adaptZoom()
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
    nodec.filter(d => (d.id === id)).attr("stroke",d=> d.id==focus? "red" : p === "on" ? "orange" : "grey")
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

//nombre de générations inférieures
function depth(d) {
    if (d.isLeave){// || !d.show){
        return 0;
    }
    else {
        max=0
        for (let i in d.children){
            let dp=depth(d.children[i])
            if (dp>max){
                max=dp
            }
        }

        return 1+max;
    }
}

//nombre total de descendants
function size(node) {//pb: compte enfants invisibles
    let r = 1; //node.show? 0:1;
    for (let c in node.children) {
        r = r + size(node.children[c]);
    }
    return r;
}


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
    } else if (n1.radius>n2.radius) {
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


function cross(n,o){
    o=n.radius
    return [
        [n.x - o, n.y - o],
        [n.x - o, n.y + o],
        [n.x + o, n.y - o],
        [n.x + o, n.y + o],
    ]
}

// constructs the convex hulls
function convexHulls(nodeGrp,   offset) {//nodegrp: liste de noeuds
    let hulls = {};
    // create point sets - not for root
    for (let k = 1; k < nodeGrp.length; ++k) {
        let n = nodeGrp[k];

        //on détermine le visible parent et on l'ajoute au hull parent ou on le créée avec uniquement
        //le parent, puis on ajoute le noeud
        // (il se peut que seuls le noeud et son grand parent soient visibles)
        let visibleParentIndex = nodeById(n.parentId).visibleParentIndex;
        let l = hulls[visibleParentIndex] || (hulls[visibleParentIndex] =cross(nodes[visibleParentIndex],offset));
        cr=cross(n,offset)
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

