.PHONY: lint

lint:
	node_modules/.bin/eslint lib/ tests/

publish:
	npm prune --production
	meteor publish
