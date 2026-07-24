import {
  Box,
  Container,
  Paper,
  Typography,
} from "@mui/material";

import type {
  ReactNode,
} from "react";



export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {

  return (

    <Box

      sx={{

        minHeight: "100vh",

        py: {
          xs: 3,
          md: 7,
        },

        bgcolor: "#f5f7fb",

        backgroundImage:
          "radial-gradient(circle at top left, #dbeafe, transparent 36%)",

      }}

    >

      <Container maxWidth="sm">


        <Paper

          elevation={0}

          sx={{

            p: {
              xs: 3,
              sm: 5,
            },

            border: "1px solid",

            borderColor: "divider",

            borderRadius: 3,

            boxShadow:
              "0 24px 60px rgba(20, 45, 95, .08)",

          }}

        >


          <Typography

            color="primary"

            fontWeight={700}

            variant="overline"

            letterSpacing={1}

          >

            RetailPulse Analytics

          </Typography>



          <Typography

            variant="h4"

            fontWeight={700}

            mt={1}

          >

            {title}

          </Typography>



          <Typography

            color="text.secondary"

            mb={4}

            mt={1}

          >

            {subtitle}

          </Typography>



          {children}


        </Paper>


      </Container>


    </Box>

  );

}