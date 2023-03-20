## Static Site Generator

The docs are setup with [MkDocs](https://www.mkdocs.org/) and [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).  

## Usage

### Configuration

The configuration is in the [`mkdocs.yml`](https://github.com/marianfoo/ui5-cc-excelUpload/blob/main/mkdocs.yml) file.  
The pages and images are stored in the [`docs`](https://github.com/marianfoo/ui5-cc-excelUpload/tree/main/docs) folder.  

### Local Setup

To run the docs locally, you can use docker.  
To build the docker image run:  
```sh
docker build . -t mkdocs  
```

To run the container:  
```sh
`docker run --rm -it -p 8000:8000 -v ${PWD}:/docs mkdocs
```
and then open http://localhost:8000/ui5-cc-excelUpload/

### Prod Build

The Documentation is hosted on GitHub Pages and is rebuild on every push to `main` with the GitHub Action [`pushDocs.yml`](https://github.com/marianfoo/ui5-cc-excelUpload/blob/main/.github/workflows/pushDocs.yml) and forced pushed to the `gh-deploy` branch.  
The current URL is: https://marianfoo.github.io/ui5-cc-excelUpload/