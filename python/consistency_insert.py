from pathlib import Path
from rdflib import Graph


INPUT_FILE = Path("../philontology8.ttl")
OUTPUT_FILE = Path("../philontology8.ttl")

graph = Graph()
graph.parse(INPUT_FILE, format="turtle")
print(graph)

update = """
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ex:   <http://www.github.com/silvialx/Onto/>
PREFIX argo: <http://www.github/argumentsontology/>

INSERT {
    ?position rdf:type ex:ConsistentPosition .
}
WHERE {
    ?position rdf:type ?positionClass .
    ?positionClass rdfs:subClassOf* ex:MetaethicalPosition .

    FILTER NOT EXISTS {
        ?position ?property1 ?supposition1 .
        ?position ?property2 ?supposition2 .

        ?property1 rdfs:subPropertyOf* argo:hasSupposition .
        ?property2 rdfs:subPropertyOf* argo:hasSupposition .

        FILTER (?supposition1 != ?supposition2)

        {
            ?supposition1 ex:isIncompatibleWith ?supposition2 .
        }
        UNION
        {
            ?supposition2 ex:isIncompatibleWith ?supposition1 .
        }
    }
}
"""

graph.update(update)
graph.serialize(destination=OUTPUT_FILE, format="turtle")

print(f"Saved materialized ontology to {OUTPUT_FILE}")