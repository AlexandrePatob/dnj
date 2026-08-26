# Visão técnica do DNJ

- [Banco de dados para o Eraser](dnj-database.eraser.md): quatro diagramas Mermaid ERD, baseados no schema remoto do Supabase em 2026-08-06.
- [Contrato de experiência do participante](../api/dnj-experience.openapi.yaml): OpenAPI 3.1, 27 caminhos documentados.
- [Contrato de operação](../api/dnj-operations.openapi.yaml): OpenAPI 3.1, 25 caminhos documentados (gestor, administração e telas ao vivo).

Os handlers atuais estão em `src/app/api`; o contrato serve tanto `/api/v1` (homologação atual) quanto o alvo `/v1` indicado no documento de experiência.
