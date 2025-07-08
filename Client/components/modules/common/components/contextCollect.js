
// Passes context menu trigger props to the context menu functions for Nodes
export function collectNode(props) {
    return { nid: props.nid, type: props.type };
}
 

// Passes context menu trigger props to the context menu functions for Charts
export function collectChart(props) {
    return { tagClass: props.tagClass, name: props.name };
}

// Passes context menu trigger props to the context menu functions for nodes in causal interface
export function collectCausalNode(props) {
    return { attr: props.attr };
}

// Passes context menu trigger props to the context menu functions for edges in causal interface
export function collectCausalEdge(props) {
    return { edgeID: props.edgeID };
}

