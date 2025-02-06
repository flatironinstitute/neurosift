import { Box, Container } from "@mui/material";
import { FunctionComponent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ScrollY from "../../components/ScrollY";
import markdownContent from "./guide.md?raw";

type GuidePageProps = {
  width: number;
  height: number;
};

const GuidePage: FunctionComponent<GuidePageProps> = ({ width, height }) => {
  return (
    <ScrollY width={width} height={height}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box
          className="markdown-content"
          sx={{
            "& h1": { marginBottom: "1rem", color: "text.primary" },
            "& h2": {
              marginTop: "2rem",
              marginBottom: "1rem",
              color: "text.primary",
            },
            "& h3": {
              marginTop: "1.5rem",
              marginBottom: "0.75rem",
              color: "text.primary",
            },
            "& p": {
              marginBottom: "1rem",
              color: "text.secondary",
              lineHeight: 1.6,
            },
            "& ul, & ol": { marginBottom: "1rem", paddingLeft: "2rem" },
            "& li": { marginBottom: "0.5rem", color: "text.secondary" },
            "& code": {
              backgroundColor: "rgba(0, 0, 0, 0.04)",
              padding: "0.2em 0.4em",
              borderRadius: "3px",
              fontSize: "85%",
            },
            "& pre code": {
              display: "block",
              overflow: "auto",
              padding: "1em",
              backgroundColor: "rgba(0, 0, 0, 0.04)",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
            },
            "& a": {
              color: "primary.main",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {markdownContent}
          </ReactMarkdown>
        </Box>
      </Container>
    </ScrollY>
  );
};

export default GuidePage;
