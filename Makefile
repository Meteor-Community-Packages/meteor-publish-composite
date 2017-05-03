.PHONY: lint

lint:
	node_modules/.bin/eslint lib/ tests/
