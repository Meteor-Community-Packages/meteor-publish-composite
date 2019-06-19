.PHONY: lint

lint:
	node_modules/.bin/eslint lib/ tests/

test:
	meteor test-packages --driver-package cultofcoders:mocha reywood:publish-composite

publish:
	npm prune --production
	meteor publish
