# Changelog

## [0.22.0](https://github.com/BananaOps/tracker/compare/v0.21.1...v0.22.0) (2026-10-30)


### ✨ Features

* **auth:** local accounts, teams, permissions and API keys ([#200](https://github.com/BananaOps/tracker/issues/200)) ([31259c3](https://github.com/BananaOps/tracker/commit/31259c30e506bd9406f8166472b3f61803ae6b36))
* **auth:** OpenID Connect login with team mapping ([#214](https://github.com/BananaOps/tracker/issues/214)) ([1b85a9a](https://github.com/BananaOps/tracker/commit/1b85a9ad519a1f171d3369e7e1d6bbdc3921c5a4))
* **auth:** per-service team scope ([#216](https://github.com/BananaOps/tracker/issues/216)) ([0d06106](https://github.com/BananaOps/tracker/commit/0d06106631af34f21cd886446fb4a08d0b51bfa5))
* **mcp:** serve the MCP endpoint from the Go server ([#238](https://github.com/BananaOps/tracker/issues/238)) ([ecede31](https://github.com/BananaOps/tracker/commit/ecede313113ff637ce8328c1e5b601af95370f57))


### 🐛 Bug Fixes

* audit follow-ups, date ranges, scope and frontend bugs ([#251](https://github.com/BananaOps/tracker/issues/251)) ([93c719d](https://github.com/BananaOps/tracker/commit/93c719d2fc6b37846c20cf9cd86719b31bd13a63))
* **auth:** enforce the forced password change on the server ([#217](https://github.com/BananaOps/tracker/issues/217)) ([8f3a9ef](https://github.com/BananaOps/tracker/commit/8f3a9efa355a240fcd92da817bbfe685b18de7da))
* correct the bugs found by the backend audit ([#250](https://github.com/BananaOps/tracker/issues/250)) ([ebbd362](https://github.com/BananaOps/tracker/commit/ebbd362134cc05ade449a45ac1fe2dc2555dce7a))
* **deps:** bump Go, web and CI dependencies, Swagger UI on docui ([#255](https://github.com/BananaOps/tracker/issues/255)) ([12ac969](https://github.com/BananaOps/tracker/commit/12ac969afdcaae348d3b4335abd87043a6e8a562))
* **deps:** patch axios, moment and brace-expansion advisories ([#215](https://github.com/BananaOps/tracker/issues/215)) ([f359d84](https://github.com/BananaOps/tracker/commit/f359d84bbb9983ba58e35518df3a92735adbc558))
* **deps:** patch follow-redirects, source-map-js, vite and zod advisories ([#236](https://github.com/BananaOps/tracker/issues/236)) ([7dedf58](https://github.com/BananaOps/tracker/commit/7dedf58db0bf3de6b89483c8c8fa1b4f27260e7e))
* **deps:** upgrade react-router-dom to v7 and patch vulnerable transitive packages ([#202](https://github.com/BananaOps/tracker/issues/202)) ([a4f9afc](https://github.com/BananaOps/tracker/commit/a4f9afc4a4c1f5f1c8756654aa4decbebae3a03c))
* **deps:** upgrade tailwindcss to v4 and eslint to v10 ([#206](https://github.com/BananaOps/tracker/issues/206)) ([6723448](https://github.com/BananaOps/tracker/commit/67234483377af4fc87973c747c0cdd78c70b2191))
* **docker:** run container as non-root user ([#198](https://github.com/BananaOps/tracker/issues/198)) ([1769020](https://github.com/BananaOps/tracker/commit/176902037d35dcdec1c72aa7815730edc94d8426))
* **web:** keep the catalog SLA, clear every lint warning ([#253](https://github.com/BananaOps/tracker/issues/253)) ([9e4c988](https://github.com/BananaOps/tracker/commit/9e4c9881973d0df7fd1b81234c83dd5278f34c2b))
* **web:** normalize event enums at the API layer, move the docs page ([#254](https://github.com/BananaOps/tracker/issues/254)) ([a87d044](https://github.com/BananaOps/tracker/commit/a87d044d373278f0ae83af0981c704c8df604665))
* **web:** zero type and lint errors, dead code removed, Vitest and web CI ([#252](https://github.com/BananaOps/tracker/issues/252)) ([393648c](https://github.com/BananaOps/tracker/commit/393648cb402108781dd76146312bb6d198dbc139))


### ⚡ Performance Improvements

* list and search results carry only the approvals of the changelog ([#259](https://github.com/BananaOps/tracker/issues/259)) ([a7a535b](https://github.com/BananaOps/tracker/commit/a7a535b1d8111ec2a0d8a4c8393aae7167e6afc4))
* paginate ListEvents, gzip the HTTP responses, cache the assets ([#257](https://github.com/BananaOps/tracker/issues/257)) ([a39d22a](https://github.com/BananaOps/tracker/commit/a39d22a708ef1e967916aa1dde1b7bbd6c4b0cb0))
* **web:** load each page on demand, React in its own chunk ([#258](https://github.com/BananaOps/tracker/issues/258)) ([ec26ef5](https://github.com/BananaOps/tracker/commit/ec26ef53ee457be5a63d6e09d35e4110cf8a7195))


### 📖 Documentation

* add CLAUDE.md for project guidance and command instructions ([5d3dc27](https://github.com/BananaOps/tracker/commit/5d3dc27dd99fa105e9b58eba2bb536e7bfc0098a))
* update CLAUDE.md for improved clarity and command structure ([e2475e5](https://github.com/BananaOps/tracker/commit/e2475e597dd5014871c1713ebfea0806bc80083d))


### 👷 CI/CD

* bump charts to 0.21.1 ([a7906b7](https://github.com/BananaOps/tracker/commit/a7906b79762bc395ac7c5ef29540cae9dd678bc1))
* include dependabot updates in release-please ([#237](https://github.com/BananaOps/tracker/issues/237)) ([57c1b8f](https://github.com/BananaOps/tracker/commit/57c1b8f5dc61c9031323d69f6bb450891c7eeafb))
* stop labelling fork pull requests in the PR title check ([#207](https://github.com/BananaOps/tracker/issues/207)) ([c9edcd8](https://github.com/BananaOps/tracker/commit/c9edcd86e66ac41e730d5154d33d51b284a74f88))
* update all GitHub Actions to their latest major versions ([#205](https://github.com/BananaOps/tracker/issues/205)) ([48e03d7](https://github.com/BananaOps/tracker/commit/48e03d747cbc4c1ca228294cfa03e209eae2e001))


### 🔧 Chores

* **deps:** bump actions/create-github-app-token from 3.2.0 to 3.3.0 ([#218](https://github.com/BananaOps/tracker/issues/218)) ([e9ba59b](https://github.com/BananaOps/tracker/commit/e9ba59bb8e11ad5b12d86f985263297664c77e0c))
* **deps:** bump github.com/stretchr/testify from 1.11.1 to 1.12.1 ([#212](https://github.com/BananaOps/tracker/issues/212)) ([6c089c9](https://github.com/BananaOps/tracker/commit/6c089c95dcc101afb7d0f39456821b0cb31fac49))
* **deps:** bump google.golang.org/grpc from 1.83.2 to 1.84.0 ([#210](https://github.com/BananaOps/tracker/issues/210)) ([bf7bd51](https://github.com/BananaOps/tracker/commit/bf7bd51fac5a4724e211dd15e456381dcccfdddb))
* **deps:** bump google.golang.org/protobuf from 1.36.11 to 1.36.12 ([#211](https://github.com/BananaOps/tracker/issues/211)) ([5cb2ad5](https://github.com/BananaOps/tracker/commit/5cb2ad55505ad8e4743f015618c0a114469bf6f8))

## [0.21.1](https://github.com/BananaOps/tracker/compare/v0.21.0...v0.21.1) (2026-07-27)


### Bug Fixes

* **layout:** correct banner and vertical bar in demo mode ([#195](https://github.com/BananaOps/tracker/issues/195)) ([8cf7106](https://github.com/BananaOps/tracker/commit/8cf71065937d95a44f71e67af86c0b5f73a79f0e))
* refresh test data configuration ([#193](https://github.com/BananaOps/tracker/issues/193)) ([c5513ec](https://github.com/BananaOps/tracker/commit/c5513ecbc4a5789e01a5860aaa476867d77613f7))

## [0.21.0](https://github.com/BananaOps/tracker/compare/v0.20.0...v0.21.0) (2026-07-17)


### Features

* **dashboard:** expand timeline with configurable environment display ([#189](https://github.com/BananaOps/tracker/issues/189)) ([dab5989](https://github.com/BananaOps/tracker/commit/dab5989a883b6f6decca4145aa4e6159e0011622))


### Bug Fixes

* add auto refresh and indicator ([#183](https://github.com/BananaOps/tracker/issues/183)) ([7f2ad0b](https://github.com/BananaOps/tracker/commit/7f2ad0b5b53fa161d7840f341ad70e289d69feaf))
* add effect on icon impat and status live ([#179](https://github.com/BananaOps/tracker/issues/179)) ([e0a0150](https://github.com/BananaOps/tracker/commit/e0a0150f174190be3d4bf4118a311edf0916a7b1))
* shot timeline by start date and add order bouton ([#184](https://github.com/BananaOps/tracker/issues/184)) ([8c2a6fc](https://github.com/BananaOps/tracker/commit/8c2a6fcc114b6eea7e0cd75ff3453f8b7485a2af))
* update deps golang and typescript ([#181](https://github.com/BananaOps/tracker/issues/181)) ([4939a3e](https://github.com/BananaOps/tracker/commit/4939a3e82df44a351b14a763e591f45c955652a4))

## [0.20.0](https://github.com/BananaOps/tracker/compare/v0.19.1...v0.20.0) (2026-06-26)


### Features

* review design sytem ([#175](https://github.com/BananaOps/tracker/issues/175)) ([e49135c](https://github.com/BananaOps/tracker/commit/e49135ca58d018f7445dc53b452145b365729483))

## [0.19.1](https://github.com/BananaOps/tracker/compare/v0.19.0...v0.19.1) (2026-05-06)


### Bug Fixes

* **deps:** bump github.com/envoyproxy/protoc-gen-validate from 1.2.1 to 1.3.3 ([#169](https://github.com/BananaOps/tracker/issues/169)) ([640beb3](https://github.com/BananaOps/tracker/commit/640beb329fc54829621bc67603fcd9476508f2d2))

## [0.19.0](https://github.com/BananaOps/tracker/compare/v0.18.0...v0.19.0) (2026-05-05)


### Features

* add waiting approval status ([74f96ad](https://github.com/BananaOps/tracker/commit/74f96adf415a24cdf3a5ff32d154de9cdd0ca4a1))
* **EventDetailsModal:** add start and end date editing fields ([1627fa1](https://github.com/BananaOps/tracker/commit/1627fa11230b84c923a19df0ee3b57535c4f7622))
* **events:** add impact indicator badge across all event views ([2910915](https://github.com/BananaOps/tracker/commit/291091553b1a46d655aa3814b22f15bc8860453e))
* **events:** replace list API with date-range search across all views ([ffe03b3](https://github.com/BananaOps/tracker/commit/ffe03b35ca227885f28daab6b521508bd3d5cd22))
* **ui:** add date-time picker component with calendar support ([05d3838](https://github.com/BananaOps/tracker/commit/05d3838db422b1db4fe275e83d7842080755e3b0))

## [0.18.0](https://github.com/BananaOps/tracker/compare/v0.17.1...v0.18.0) (2026-04-07)


### Features

* **analytics:** add Microsoft Clarity integration for user analytics ([#165](https://github.com/BananaOps/tracker/issues/165)) ([7ef9dff](https://github.com/BananaOps/tracker/commit/7ef9dff1459bd61a97b8e2aa0a45afcad2d7c7f2))

## [0.17.1](https://github.com/BananaOps/tracker/compare/v0.17.0...v0.17.1) (2026-04-07)


### Bug Fixes

* **deps:** bump github.com/grpc-ecosystem/grpc-gateway/v2 from 2.27.3 to 2.27.4 ([#135](https://github.com/BananaOps/tracker/issues/135)) ([943ae96](https://github.com/BananaOps/tracker/commit/943ae96a185df906f15d50ec10b192f56e863f2a))
* **Snyk:** Security upgrade vite from 8.0.3 to 8.0.5 ([#160](https://github.com/BananaOps/tracker/issues/160)) ([0e445cc](https://github.com/BananaOps/tracker/commit/0e445cc574952373e79366412eec1b4103a93963))

## [0.17.0](https://github.com/BananaOps/tracker/compare/v0.16.2...v0.17.0) (2026-04-05)


### Features

* add link page and search func ([#152](https://github.com/BananaOps/tracker/issues/152)) ([c5af3be](https://github.com/BananaOps/tracker/commit/c5af3be6aad45706948246ffa6877259cb3adff3))


### Bug Fixes

* update release-please workflow to use GitHub app token for authentication ([2bd15d2](https://github.com/BananaOps/tracker/commit/2bd15d21eff3a7ea692fdbe29850e55c09e8d006))

## [0.16.2](https://github.com/BananaOps/tracker/compare/v0.16.1...v0.16.2) (2026-03-03)


### Bug Fixes

* update dockerfile multiarch ([#149](https://github.com/BananaOps/tracker/issues/149)) ([e590702](https://github.com/BananaOps/tracker/commit/e5907021e9fe09e977487dd4e4b967051a0d4aec))

## [0.16.1](https://github.com/BananaOps/tracker/compare/v0.16.0...v0.16.1) (2026-03-03)


### Bug Fixes

* upgrade npm lock ([#147](https://github.com/BananaOps/tracker/issues/147)) ([f5155ca](https://github.com/BananaOps/tracker/commit/f5155cad2c7c2231285e40c513c216d179ae01d6))

## [0.16.0](https://github.com/BananaOps/tracker/compare/v0.15.0...v0.16.0) (2026-03-03)


### Features

* add catalog service event page and event page ([#141](https://github.com/BananaOps/tracker/issues/141)) ([0564348](https://github.com/BananaOps/tracker/commit/056434816cd28741086c46de89420c1b21d14900))


### Bug Fixes

* **Snyk:** Security upgrade glob from 11.1.0 to 12.0.0 ([#143](https://github.com/BananaOps/tracker/issues/143)) ([d5d733b](https://github.com/BananaOps/tracker/commit/d5d733b49ad206befbe6e9240f67aa3c2af4ef33))

## [0.15.0](https://github.com/BananaOps/tracker/compare/v0.14.1...v0.15.0) (2026-02-02)


### Features

* add api stats ([#142](https://github.com/BananaOps/tracker/issues/142)) ([06d28ef](https://github.com/BananaOps/tracker/commit/06d28efaf581843ac7a22640ee5298fadef79503))
* add new option graphdeps ([#139](https://github.com/BananaOps/tracker/issues/139)) ([31b7c61](https://github.com/BananaOps/tracker/commit/31b7c610751e037582bb3d10614f201152d82356))

## [0.14.1](https://github.com/BananaOps/tracker/compare/v0.14.0...v0.14.1) (2026-01-21)


### Bug Fixes

* correct event update ([#138](https://github.com/BananaOps/tracker/issues/138)) ([fbc82b1](https://github.com/BananaOps/tracker/commit/fbc82b1f9aada2443fc4e21871034b1a4ba88c36))
* correct perfomance ([#136](https://github.com/BananaOps/tracker/issues/136)) ([3dabed4](https://github.com/BananaOps/tracker/commit/3dabed4833900ca89c01f8bac87c40f1a516bb1e))

## [0.14.0](https://github.com/BananaOps/tracker/compare/v0.13.1...v0.14.0) (2026-01-19)


### Features

* add status planned in front ([14abb2e](https://github.com/BananaOps/tracker/commit/14abb2e3b95e7ed3b4500831f5f0df04637474c8))


### Bug Fixes

* calender start of week day ([#134](https://github.com/BananaOps/tracker/issues/134)) ([31fed21](https://github.com/BananaOps/tracker/commit/31fed21634e0e0de64a0a05993994a684af6aa6f))
* icon not available in build tracker ([#132](https://github.com/BananaOps/tracker/issues/132)) ([b86a6f8](https://github.com/BananaOps/tracker/commit/b86a6f88b3b67117b1070b6b47a502c223a71b59))
* status and shoudlCreateLock function ([8a82e33](https://github.com/BananaOps/tracker/commit/8a82e33041b67eb32cc3aa3054c53ee006861d0a))

## [0.13.1](https://github.com/BananaOps/tracker/compare/v0.13.0...v0.13.1) (2026-01-19)


### Bug Fixes

* run npm install ([#130](https://github.com/BananaOps/tracker/issues/130)) ([6b2871f](https://github.com/BananaOps/tracker/commit/6b2871f17501b3e9c0489634ea1a97a7f6e3ca23))

## [0.13.0](https://github.com/BananaOps/tracker/compare/v0.12.0...v0.13.0) (2026-01-17)


### Features

* add catalog dependencies endpoint ([3791683](https://github.com/BananaOps/tracker/commit/3791683fd605c842e66552f072528941af981ca2))
* add slackId to an existing event ([#129](https://github.com/BananaOps/tracker/issues/129)) ([a15cbc0](https://github.com/BananaOps/tracker/commit/a15cbc0da4fdc444fcefc8004c0314b07ec6b381))
* create recurrent events ([#128](https://github.com/BananaOps/tracker/issues/128)) ([4fc6482](https://github.com/BananaOps/tracker/commit/4fc6482ab482a6aad6dec7d8151354d5d97035a4))
* **helm/tracker:** add support for gateway API httproute in addition of ingress ([#122](https://github.com/BananaOps/tracker/issues/122)) ([19fe83d](https://github.com/BananaOps/tracker/commit/19fe83d6e517be024ab1bbac894926aea135351b))
* **helm/tracker:** add support for openshift route object in addition of ingress ([#123](https://github.com/BananaOps/tracker/issues/123)) ([c9319ed](https://github.com/BananaOps/tracker/commit/c9319eddfbd0d871a3d4adec1fba85d5fcfeea78))


### Bug Fixes

* **Snyk:** Security upgrade react-router-dom from 6.30.2 to 6.30.3 ([#127](https://github.com/BananaOps/tracker/issues/127)) ([7ee8553](https://github.com/BananaOps/tracker/commit/7ee85535e74e52c67e3bb9a94ae7e787b0c19e56))

## [0.12.0](https://github.com/BananaOps/tracker/compare/v0.11.0...v0.12.0) (2025-12-23)


### Features

* add catalog dependencies ([#119](https://github.com/BananaOps/tracker/issues/119)) ([2ed9eab](https://github.com/BananaOps/tracker/commit/2ed9eab03d7fdf2b53eb28469afd37f0d210d1b6))
* add endpoint changelog ([#121](https://github.com/BananaOps/tracker/issues/121)) ([051ddce](https://github.com/BananaOps/tracker/commit/051ddce7fc02e1887d6f5c940fa31dd5e7113ae5))


### Bug Fixes

* errer message when service is locked ([4827e31](https://github.com/BananaOps/tracker/commit/4827e31b89b35005a7c695536bc16f4d1605c7f8))
* limite service name to 25 ([4358225](https://github.com/BananaOps/tracker/commit/43582257930e4240ef40e6f9f25209be27eeaff8))

## [0.11.0](https://github.com/BananaOps/tracker/compare/v0.10.1...v0.11.0) (2025-12-17)


### Features

* create mcp server ([#114](https://github.com/BananaOps/tracker/issues/114)) ([4cb5ddd](https://github.com/BananaOps/tracker/commit/4cb5dddbd61c4ef5d4fd0090cbf277e5594245c0))
* insight page and neon tech ui style ([#118](https://github.com/BananaOps/tracker/issues/118)) ([50cebaf](https://github.com/BananaOps/tracker/commit/50cebafed4c123eeec9cfbb0d243c6197a84b576))


### Bug Fixes

* first add to catalog failed ([#116](https://github.com/BananaOps/tracker/issues/116)) ([60634fa](https://github.com/BananaOps/tracker/commit/60634fa9ea031dbd6021bba55c47409ec1cc3260))
* no imediat close event on sidebar ([#115](https://github.com/BananaOps/tracker/issues/115)) ([bfc94bb](https://github.com/BananaOps/tracker/commit/bfc94bbaa8408a61cb9969bffea502bb5acd1912))
* run npm install to update lock ([16cde42](https://github.com/BananaOps/tracker/commit/16cde42c54809ab6e1ccf3eab3ceadb226cbe52b))

## [0.10.1](https://github.com/BananaOps/tracker/compare/v0.10.0...v0.10.1) (2025-11-30)


### Bug Fixes

* remove arm build for the moment ([#107](https://github.com/BananaOps/tracker/issues/107)) ([086e351](https://github.com/BananaOps/tracker/commit/086e35116a6e227961f7e89e574c95d7bd295ac4))

## [0.10.0](https://github.com/BananaOps/tracker/compare/v0.9.1...v0.10.0) (2025-11-26)


### Features

* add approbation ([#103](https://github.com/BananaOps/tracker/issues/103)) ([7abd129](https://github.com/BananaOps/tracker/commit/7abd129137ff305e76867f0fea0676ffe5c8a18b))
* add demo banner  ([#105](https://github.com/BananaOps/tracker/issues/105)) ([7e2ec9e](https://github.com/BananaOps/tracker/commit/7e2ec9e55692e51807c00fec263326482ccffb33))
* add démo option ([1448653](https://github.com/BananaOps/tracker/commit/1448653373e021bdae06fe9d9fd836732755b6f6))
* update lock function ([#100](https://github.com/BananaOps/tracker/issues/100)) ([b9def2a](https://github.com/BananaOps/tracker/commit/b9def2a2d29a411b9f1b0637b323115e976229f5))


### Bug Fixes

* npm ci ([18b1718](https://github.com/BananaOps/tracker/commit/18b171852d0d6a52bd23929764b7c32aa32500d1))

## [0.9.1](https://github.com/BananaOps/tracker/compare/v0.9.0...v0.9.1) (2025-11-20)


### Bug Fixes

* remove unsused var ([#97](https://github.com/BananaOps/tracker/issues/97)) ([8cca112](https://github.com/BananaOps/tracker/commit/8cca1121d64d6fa9dcead238e12f8757153766cd))

## [0.9.0](https://github.com/BananaOps/tracker/compare/v0.8.0...v0.9.0) (2025-11-20)


### Features

* add front tracker ([#96](https://github.com/BananaOps/tracker/issues/96)) ([e3b0dbd](https://github.com/BananaOps/tracker/commit/e3b0dbd7ad6c5579503a1e035adc7dd9f815cbda))


### Bug Fixes

* add id in update event ([#92](https://github.com/BananaOps/tracker/issues/92)) ([0e4d82c](https://github.com/BananaOps/tracker/commit/0e4d82cc0d1a8186b8276c3b009a643952889b9d))

## [0.8.0](https://github.com/BananaOps/tracker/compare/v0.7.4...v0.8.0) (2025-07-08)


### Features

* add incident drift ([#86](https://github.com/BananaOps/tracker/issues/86)) ([350cf05](https://github.com/BananaOps/tracker/commit/350cf05ece72fe2e499c8aaaa370ac3eaa6b56da))


### Bug Fixes

* correct dokcer tag ([b08c972](https://github.com/BananaOps/tracker/commit/b08c9720e09659250952e1f91347978927b1323d))

## [0.7.4](https://github.com/BananaOps/tracker/compare/v0.7.3...v0.7.4) (2025-03-26)


### Bug Fixes

* add branch main ([c250282](https://github.com/BananaOps/tracker/commit/c250282066418dde25e7a48d04dd035d6a4846f7))

## [0.7.3](https://github.com/BananaOps/tracker/compare/v0.7.2...v0.7.3) (2025-03-26)


### Bug Fixes

* add action autocommit ([52559b8](https://github.com/BananaOps/tracker/commit/52559b873687696ec036145d7ac3b4999678cd87))

## [0.7.2](https://github.com/BananaOps/tracker/compare/v0.7.1...v0.7.2) (2025-03-26)


### Bug Fixes

* correct helm release ([#72](https://github.com/BananaOps/tracker/issues/72)) ([cbf017d](https://github.com/BananaOps/tracker/commit/cbf017df065dbb1204e76246b841b0969bdc27fc))

## [0.7.1](https://github.com/BananaOps/tracker/compare/v0.7.0...v0.7.1) (2025-03-26)


### Bug Fixes

* dora metrics duration ([#70](https://github.com/BananaOps/tracker/issues/70)) ([82ee757](https://github.com/BananaOps/tracker/commit/82ee75740fd4890780a98577346919266d46e99b))

## [0.7.0](https://github.com/BananaOps/tracker/compare/v0.6.0...v0.7.0) (2025-03-26)


### Features

* init DORA metrics ([#66](https://github.com/BananaOps/tracker/issues/66)) ([bc46aa7](https://github.com/BananaOps/tracker/commit/bc46aa7eea420bf96baf45cafdb5f0240c467f41))
