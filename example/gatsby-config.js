module.exports = {
  siteMetadata: {
    title: 'Example',
  },
  plugins: [
    'gatsby-plugin-sharp',
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          {
            resolve: 'gatsby-remark-images',
            options: {
              maxWidth: 200,
            },
          },
        ],
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'pages',
        path: './src/data/pages/',
      },
      __key: 'pages',
    },
    // our plugin: gatsby-transformer-remark-frontmatter
    'test-plugin',
  ],
}
