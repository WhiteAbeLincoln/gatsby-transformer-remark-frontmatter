import React, { PropsWithChildren, useState } from "react"
import { graphql } from 'gatsby'
import * as style from './index.module.css'

interface MdContent {
  id?: string
  __typename: string
  html: string
  parent?: {
    id: string
    __typename: string
  }
}

const Md = ({ data, ...props }: { data: MdContent } & JSX.IntrinsicElements['div']) => {
  const [showHTML, setState] = useState(false)
  const copy = data;
  if ('frontmatter' in copy) {
    delete (copy as any).frontmatter
  }
  return (
    <div className={style.md} {...props}>
      <button onClick={() => setState(v => !v)}>View {showHTML ? 'Rendered' : 'Raw'}</button>
      {showHTML ? <pre style={{ overflowX: 'auto' }}>{JSON.stringify(data, null, 2)}</pre> : <div dangerouslySetInnerHTML={{__html: data.html}} />}
    </div>
  )
}

const Section = ({ children, header, indentChildren = true }: PropsWithChildren<{ header: string, indentChildren?: boolean }>) => (
  <div>
    <pre style={{ fontSize: 30 }}>{header}</pre>
    <div style={indentChildren ? { marginLeft: 30 } : {}}>
      {children}
    </div>
  </div>
)

// markup
const IndexPage = ({ data: { allMarkdownRemark } }: any) => {
  const nodes: any[] = allMarkdownRemark.nodes
  return (
    <main>
      {nodes.map((n, i) => (
        <Section header={`idx ${i}:`}>
          <Md data={n} />
          <Section header="frontmatter:">
            <Section header="sidebar:">
              <Md data={n.frontmatter.sidebar} />
            </Section>
            <Section header="comments:">
              {(n.frontmatter.comments ?? []).map((c: any, i: number) => (
                <Section header={`idx ${i}`}>
                  <Md data={c.content} />
                  <p className="author">-By: {c.author}</p>
                </Section>
              ))}
            </Section>
          </Section>
        </Section>
      ))}
    </main>
  )
}

export const pageQuery = graphql`
  fragment FMdContent on FrontmatterMarkdownField {
    __typename
    html
    parent {
      id
      __typename
    }
    excerpt
    excerptAst
    htmlAst
    rawMarkdownBody
    tableOfContents
    timeToRead
    headings {
      depth
      id
      value
    }
    wordCount {
      paragraphs
      sentences
      words
    }
  }
  fragment MdContent on MarkdownRemark {
    id
    __typename
    html
    parent {
      id
      __typename
    }
  }
  query PageQuery {
    allMarkdownRemark {
      nodes {
        ...MdContent
        frontmatter {
          sidebar {
            ...FMdContent
          }
          comments {
            author
            content {
              ...FMdContent
            }
          }
        }
      }
    }
  }
`

export default IndexPage
