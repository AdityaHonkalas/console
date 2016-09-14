# This file is an example of how you might set up your environment to
# run the tectonic console during development. To use it for running
# bridge, do
#
# . contrib/environment.sh
# ./bin/bridge
#

# You'll need a working kubectl, and you'll need jq installed and in
# your path for this script to work correctly.

# The environment variables beginning with "BRIDGE_" act just like
# bridge command line arguments - in fact. to get more information
# about any of them, you can run ./bin/bridge --help

export BRIDGE_HOST="http://127.0.0.1:9000"
export BRIDGE_USER_AUTH="disabled"
export BRIDGE_K8S_MODE="off-cluster"
export BRIDGE_K8S_MODE_OFF_CLUSTER_ENDPOINT=$(kubectl config view -o json | jq '{myctx: .["current-context"], ctxs: .contexts[], clusters: .clusters[]}' | jq 'select(.myctx == .ctxs.name)' | jq 'select(.ctxs.context.cluster ==  .clusters.name)' | jq '.clusters.cluster.server' -r)
export BRIDGE_K8S_MODE_OFF_CLUSTER_SKIP_VERIFY_TLS=true
export BRIDGE_K8S_AUTH="bearer-token"

secretname=$(kubectl get secrets --namespace=default \
  -l owner=tectonic-devs \
  -o template --template="{{range.items}}{{.metadata.name}}{{end}}")
export BRIDGE_K8S_AUTH_BEARER_TOKEN=$(kubectl get secret $secretname -o template --template='{{.data.token}}' | base64 --decode)
