onRecordCreateRequest((e) => require(`${__hooks}/lib/edge.js`).validateEdge(e), "edges");
onRecordUpdateRequest((e) => require(`${__hooks}/lib/edge.js`).validateEdge(e), "edges");
