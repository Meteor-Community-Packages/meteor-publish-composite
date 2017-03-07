.PHONY: lint

lint:
	node_modules/.bin/eslint lib/ tests/

test-unit:
	meteor test-packages --driver-package practicalmeteor:mocha
