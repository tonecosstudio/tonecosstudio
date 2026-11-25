# Auditoria progressiva das tags do catálogo TONART

## Objetivo

Revisar todos os modelos publicados, um por vez, e completar a taxonomia pública comum aos catálogos antigo e Telegram. O Worker/D1 continua sendo a única SSOT pública. Cada relação de personagem e cada atributo precisa de revisão individual e evidência registrada antes de entrar em uma migration aplicável.

## Regra de trabalho

1. Selecionar um modelo pelo ID canônico e ler os dados públicos atuais.
2. Revisar nome do personagem, franquia, editora, universo e demais atributos separadamente.
3. Para confrontos, inserir uma relação por personagem; para grupos sem nomes, não presumir integrantes.
4. Registrar ID, evidência e resultado abaixo. Só então incluir as associações explícitas por `model_id` no seed do D1.
5. Marcar ambiguidades como retidas para revisão. Não derivar personagens de slug ou texto solto.
6. Não aplicar migrations nem publicar Worker sem o gate autorizado. O frontend nunca mantém uma segunda lista de tags.

## Progresso

**Concluídos nesta auditoria individual: 712 modelos.** O restante dos lotes anteriores permanece pendente até ser conferido por modelo; quantidade total e percentual serão calculados depois de reconciliar os inventários original e Telegram sem duplicações.

| ID do modelo | Título público | Tags de personagem confirmadas | Escopo de franquia e editora | Evidência |
|---|---|---|---|---|
| `mdl_3cbf3e946dfb7e851f86` | Batman e Coringa busto híbrido | Batman · Coringa | Batman · DC | Título da API pública nomeia os dois; duas relações explícitas no seed 0033. |
| `mdl_9e7213da423e0abf8710` | Batman e Flash busto híbrido | Batman · Flash | Batman · DC | Título público nomeia ambos; Flash é vínculo entre franquias explicitamente aprovado. |
| `mdl_46c56e734de37f452c3c` | Batman vs. Homem de Ferro em diorama | Batman · Homem de Ferro | Batman · DC · Marvel | Título público nomeia ambos; Homem de Ferro usa sua identidade Marvel canônica em vínculo entre franquias. |
| `mdl_c895d5041056cd6029a9` | Capuz Vermelho vs. Coringa em diorama | Capuz Vermelho · Coringa | Batman · DC | Título público nomeia ambos; duas relações explícitas no seed 0033. |
| `mdl_cb51000743d4ca8f89da` | Batfamília Batman com jovens heróis | Batman | Batman · DC | Batman é nomeado. “Jovens heróis” não identifica outros personagens, então nenhum outro chip foi criado. |
| `mdl_e32e50d2603e8b2285c2` | Batfamília estilizada com Batman e jovens heróis | Batman | Batman · DC | Batman é nomeado. Integrantes não nomeados permanecem sem tag própria. |
| `mdl_526ad61e3ce855c3dc0b` | Coringa e Arlequina sentados em diorama | Coringa · Arlequina | Batman · DC | O título público nomeia ambos separadamente; duas relações explícitas por ID no seed 0033. |
| `mdl_023cf42b3596d70b93fd` | Batman | Batman | Batman · DC | O contrato do modelo publicado registra o título “Batman” e a pasta “Batman”; uma relação individual no seed 0033. |
| `mdl_02f8fcaccab93c11ce04` | Coringa | Coringa | Batman · DC | O contrato do modelo publicado registra o título “Coringa” e a pasta “Coringa”; uma relação individual no seed 0033. |
| `mdl_07693ad24c8ef3ecd685` | Coringa | Coringa | Batman · DC | O contrato do modelo publicado registra o título “Coringa” e a pasta “Coringa”; uma relação individual no seed 0033. |
| `mdl_08cf757918e46022b8bc` | Coringa | Coringa | Batman · DC | O contrato do modelo publicado registra o título “Coringa” e a pasta “Coringa”; uma relação individual no seed 0033. |
| `mdl_15e4be7003756987df96` | Batman | Batman | Batman · DC | O contrato do modelo publicado registra o título “Batman” e a pasta “Batman”; uma relação individual no seed 0033. |
| `mdl_15f27ffaed7c34388d94` | Batman | Batman | Batman · DC | O contrato do modelo publicado registra o título “Batman” e a pasta “Batman”; uma relação individual no seed 0033. |
| `mdl_175e3ad27874605eceee` | Batman | Batman | Batman · DC | O contrato do modelo publicado registra o título “Batman” e a pasta “Batman”; uma relação individual no seed 0033. |
| `mdl_194bf4644afdcfddee9e` | Coringa | Coringa | Batman · DC | O contrato do modelo publicado registra o título “Coringa” e a pasta “Coringa”; uma relação individual no seed 0033. |
| `mdl_1b6d4681d1ce7ce2e8e0` | Coringa | Coringa | Batman · DC | A API pública confirma título, franquia e pasta “Coringa”; “traje roxo” do slug não entrou na tag de personagem. |
| `mdl_1dd17d993d3c38d4ba01` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta “Batman”; relação individual por ID no seed 0033. |
| `mdl_207e2f04c9295f1632a3` | Duas-Caras | Duas-Caras | Batman · DC | A API pública confirma título, franquia e pasta “Duas-Caras”; relação individual por ID no seed 0033. |
| `mdl_222a680601af42aa64a2` | Coringa | Coringa | Batman · DC | A API pública confirma título, franquia e pasta “Coringa”; relação individual por ID no seed 0033. |
| `mdl_24f4f4558511632e9e5d` | Robin | Robin | Batman · DC | A API pública confirma título, franquia e pasta “Robin”; relação individual por ID no seed 0033. |
| `mdl_2574aceac9fc3d65b8a5` | Thomas Wayne | Thomas Wayne | Batman · DC | A API pública confirma título, franquia e pasta; “Flashpoint”/traje não entrou na tag de personagem. |
| `mdl_27500867faf0aa348081` | Coringa | Coringa | Batman · DC | A API pública confirma título, franquia e pasta “Coringa”; relação individual por ID no seed 0033. |
| `mdl_27ac8bbb831c8b7370c4` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; “Heath Ledger” no slug é contexto de variante, não parte do nome da tag. |
| `mdl_2aea02890f9b6b779ea7` | Capuz Vermelho | Capuz Vermelho | Batman · DC | A API pública confirma título, franquia e pasta; uma relação individual por ID no seed 0033. |
| `mdl_33ce7be57b240fc1b718` | Batgirl | Batgirl | Batman · DC | A API pública confirma título, franquia e pasta; uma relação individual por ID no seed 0033. |
| `mdl_342764926b974b614426` | Espantalho | Espantalho | Batman · DC | A API pública confirma título, franquia e pasta; veneno/corvos do slug são detalhes da peça, não personagens. |
| `mdl_375e5295b44392477123` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; o detalhe “TNT” no slug não é outra tag de personagem. |
| `mdl_415564b16a1dcdfc09a6` | Batgirl | Batgirl | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_44c906449ddd263ea3b4` | Hera Venenosa | Hera Venenosa | Batman · DC | A API pública confirma título, franquia e pasta; plantas carnívoras ficam como contexto da peça. |
| `mdl_48a24a98c8efae6ea0d0` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; cor da estátua e base não viraram tags de personagem. |
| `mdl_52becd73a5a675aec690` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; “Heath Ledger” e arma são contexto da variante. |
| `mdl_547db59ec157978aca35` | Asa Noturna | Asa Noturna | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_64fc898cc82a674f0f0e` | Bane | Bane | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_682d0f308732a9987af1` | The Batman em pé sobre Bat-Sinal | Batman | Batman · DC | A API pública nomeia Batman; o Bat-Sinal é objeto da peça, não outro personagem. Tag normalizada para “Batman”. |
| `mdl_6f27029e51576e9bfc06` | Arlequina | Arlequina | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_7120657fdc8c5558fb1c` | Batman | Batman | Batman · DC | A API pública confirma Batman; o tubarão do slug não comprova outro personagem. |
| `mdl_752795029ddfda3ad2a9` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; a escada é cenário, não tag de personagem. |
| `mdl_7ac94a08f91a26997e6a` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; “Heath Ledger”/cadeira descrevem variante, não nome de personagem. |
| `mdl_8162a74fdab68ca50cc9` | Bane | Bane | Batman · DC | A API pública confirma título e pasta; tubos são detalhe da peça, não parte do nome de personagem. |
| `mdl_81c323cacd493c3e21fe` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; “Arkham” descreve variante, não nome de personagem. |
| `mdl_82447cdd9af5b334e789` | Charada | Charada | Batman · DC | A API pública confirma título, franquia e pasta; bengala/malas são detalhes da peça. |
| `mdl_8372aba1f453dab37a0e` | Batman Que Ri | Batman Que Ri | Batman · DC | A API pública confirma o nome canônico, franquia e pasta; uma relação individual por ID no seed 0033. |
| `mdl_84516f55cfb068fd8b85` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; “Dark Crusader”/gárgula são variantes, não nome de personagem. |
| `mdl_8ad3ee741b623f9d5505` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; “Cesar Romero” identifica a versão interpretada, não muda o personagem. |
| `mdl_8e948f8b4e6e619bfa05` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; “Dark Knight”/gárgula são contexto da versão. |
| `mdl_952cdae65a6fabb5e952` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; armadura/arma são variante, não parte do nome. |
| `mdl_9c836b70d0cde3e17f8b` | Pinguim | Pinguim | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_9f8b468334105b08735c` | Mulher-Gato | Mulher-Gato | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_a2c3cd27fdd2b38cd3ff` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; trono/Batcaverna são contexto da peça. |
| `mdl_b38c91e328ec3298f081` | Batman | Batman | Batman · DC | A API pública confirma título e pasta; “Zack Snyder” identifica versão, não outra tag. |
| `mdl_b3b39f371cfe6388ba76` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; torre gótica é cenário, não outro personagem. |
| `mdl_b3d7635fd06c019778da` | Batman | Batman | Batman · DC | A API pública confirma título e pasta; rocha é base de exposição. |
| `mdl_b5c6834031dbd44f93e3` | Robin | Robin | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_b6c10bda28bbee1b6a82` | Batman | Batman | Batman · DC | A API pública confirma Batman; o Bat-Sinal é objeto da peça, não outro personagem. |
| `mdl_b8ca1abf2029e7137e27` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; roupa vermelha/dança são características da versão. |
| `mdl_bcd3efa5d9bf83857d7a` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; “Begins”/pedestal são contexto da versão. |
| `mdl_c0ec14dee3bb07edbdb7` | Mulher-Gato | Mulher-Gato | Batman · DC | A API pública confirma título, franquia e pasta; “gato” no slug não comprova outro personagem. |
| `mdl_c1d0f543497b64c64e52` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; machados são versão da peça, não outros personagens. |
| `mdl_c2879806ea423c421029` | Bane | Bane | Batman · DC | A API pública confirma título, franquia e pasta; veneno é detalhe visual da variante. |
| `mdl_c6a96b072f4007bfd229` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; “enfermeira” no slug não identifica um segundo personagem. |
| `mdl_c721083b9ec07c93674b` | Capuz Vermelho | Capuz Vermelho | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_c83974608c9c8ac271d5` | Coringa | Coringa | Batman · DC | A API pública confirma título e pasta; relação individual por ID no seed 0033. |
| `mdl_cbc13c8bfe6a96b51dce` | Cavaleiro de Arkham | Cavaleiro de Arkham | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_d4b057aaeec886e85652` | Arlequina | Arlequina | Batman · DC | A API pública confirma título, franquia e pasta; taco é detalhe da peça, não outro personagem. |
| `mdl_d539c403f943f6323516` | Espantalho | Espantalho | Batman · DC | A API pública confirma título, franquia e pasta; foice/abóboras são adereços da peça. |
| `mdl_d8fed0beef9cea5733d0` | Thomas Wayne | Thomas Wayne | Batman · DC | A API pública confirma título, franquia e pasta; Flashpoint é contexto de versão. |
| `mdl_f3b32e4eaa5c034a776c` | Bruce Wayne sem camisa com capa em exibição | Bruce Wayne | Batman · DC | O título público identifica Bruce Wayne; criada identidade de personagem com nome separado da coleção Batman. |
| `mdl_f3f3804fb9c693f2c368` | Batman | Batman | Batman · DC | A API pública nomeia Batman; “Batman Beyond” é contexto de versão e não identifica sucessor pelo nome. |
| `mdl_f45aec10b9366e71f742` | Robin | Robin | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_f57c1cf7636ec1178f96` | Arlequina | Arlequina | Batman · DC | A API pública confirma título, franquia e pasta; “Margot Robbie” identifica a versão, não compõe o nome. |
| `mdl_f6d22cf61510c59aa022` | Batman | Batman | Batman · DC | A API pública confirma título e pasta; “chibi” é estilo da peça. |
| `mdl_f7b3e1158c2b4c30d5cd` | Mulher-Gato | Mulher-Gato | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_fc2638f3965c08c743ff` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_fd9dfe132cbc686c8e2a` | Batwoman | Batwoman | Batman · DC | A API pública confirma título, franquia e pasta; relação individual por ID no seed 0033. |
| `mdl_19f93c59d12a54c79613` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; cor marrom/rocha são detalhes da peça. |
| `mdl_274cbc3cb49c4f49e925` | Batman | Batman | Batman · DC | A API pública confirma título, franquia e pasta; “Grim Knight”/armamento são variante, não nome. |
| `mdl_175e7bee8c49d5ba575d` | Clark Kent abrindo camisa estátua cinza | Clark Kent | Superman · DC | A API pública nomeia Clark Kent; a tag de personagem permanece distinta da franquia Superman. |
| `mdl_a391fdda394f031519a3` | General Zod | General Zod | Superman · DC | A API pública confirma título e franquia; relação individual por ID no seed 0033. |
| `mdl_43abc38325ad6398f130` | Superman absoluto traje escuro sobre rochas | Superman | Superman · DC | A API pública nomeia Superman; roupa/base não viraram tags de personagem. |
| `mdl_3232944564828b763961` | Superman agachado sobre destroços | Superman | Superman · DC | A API pública nomeia Superman; pose/destroços são detalhes do modelo. |
| `mdl_7a76209648c8163ddc08` | Superman armadura com capa sobre base | Superman | Superman · DC | A API pública nomeia Superman; armadura/capa/base são contexto da versão. |
| `mdl_ac35b31b0a59ce763fee` | Superman barbado estátua colorida | Superman | Superman · DC | A API pública nomeia Superman; barba/cor são aparência da estátua. |
| `mdl_da1fbe8b05079b5098fd` | Superman barbado sobre crânios | Superman | Superman · DC | A API pública nomeia Superman; barba/crânios são estilização da peça. |
| `mdl_1291a1198d1443a2f298` | Superman Ciborgue | Superman Ciborgue | Superman · DC | A API pública identifica Superman Ciborgue como personagem distinto de Superman. |
| `mdl_3630726a42ea0e69598d` | Superman clássico com capa sobre cristais | Superman | Superman · DC | A API pública nomeia Superman; “clássico”/capa/cristais são versão e cenário. |
| `mdl_741c4e8b8034f6f83d37` | Superman clássico estátua estilizada | Superman | Superman · DC | A API pública nomeia Superman; “clássico”/estilização são variante. |
| `mdl_0510aa2d2710f61ec7da` | Superman clássico sobre base industrial | Superman | Superman · DC | A API pública nomeia Superman; “clássico”/base industrial são contexto da peça. |
| `mdl_bda3f9751db89785e4e0` | Superman clássico sobre cristais | Superman | Superman · DC | A API pública nomeia Superman; “clássico”/cristais descrevem a variante. |
| `mdl_87621409eb4d83dc4759` | Superman clássico sobre pedestal | Superman | Superman · DC | A API pública nomeia Superman; pedestal é suporte da peça. |
| `mdl_df966668990d829ea5da` | Superman em pé sobre destroços em diorama | Superman | Superman · DC | A API pública nomeia Superman; pose/destroços são contexto do modelo. |
| `mdl_ecacd08d22176e373319` | Superman estátua cinza com capa | Superman | Superman · DC | A API pública nomeia Superman; cor/capa descrevem aparência da estátua. |
| `mdl_972a8142795fc7116ae7` | Superman estátua cinza flutuando sobre base | Superman | Superman · DC | A API pública nomeia Superman; pose/cor/base são detalhes da peça. |
| `mdl_7a67e16cbe4747947138` | Superman estátua cinza sobre símbolo | Superman | Superman · DC | A API pública nomeia Superman; cor/símbolo são detalhes da estátua. |
| `mdl_5be10a5030ba6fba1f8d` | Superman metal com visão de calor sobre crânios | Superman | Superman · DC | A API pública nomeia Superman; metal/visão de calor/crânios são atributos da peça. |
| `mdl_eecf829ba068be95fe72` | Superman traje escuro sobre chamas | Superman | Superman · DC | A API pública nomeia Superman; traje/chamas são detalhes de aparência e cenário. |
| `mdl_69757d97b1afb89fe191` | Superman traje preto em pé sobre destroços | Superman | Superman · DC | A API pública nomeia Superman; traje/pose/destroços são contexto da peça. |
| `mdl_640a0b5cd19818dbf0ef` | Superman traje preto três vistas | Superman | Superman · DC | A API pública nomeia Superman; traje preto/três vistas são contexto do modelo. |
| `mdl_8127f939de8da8a9f5a7` | Superman traje preto variações de estátua | Superman | Superman · DC | A API pública nomeia Superman; traje/variações são detalhes da peça. |
| `mdl_674df31809fb52f1b4df` | Superman voando sobre base de cristal | Superman | Superman · DC | A API pública nomeia Superman; pose/base são detalhes do modelo. |
| `mdl_9f23375a9e66d4e9bc48` | Superman voando sobre base de cristal foto | Superman | Superman · DC | A API pública nomeia Superman; “foto” é variante de registro, não outro personagem. |
| `mdl_3258ddc2f21ee28df674` | Superman voando sobre destroços | Superman | Superman · DC | A API pública nomeia Superman; pose/destroços são detalhes do modelo. |
| `mdl_8cd028b8c191594de05d` | Superman Zumbi | Superman Zumbi | Superman · DC | A API pública identifica Superman Zumbi como forma/identidade própria, distinta de Superman genérico. |
| `mdl_0b658030e9217dbc047b` | Apocalipse no trono | Apocalipse | Vilões · Marvel | A API pública confirma o personagem “Apocalipse” e o bucket “Vilões”; a migration cria personagem individual e associa editora Marvel sem inferir equipe. |
| `mdl_9ed6330a509f1ad08ab8` | Carnificina | Carnificina | Carnificina · Marvel · Homem-Aranha | A API pública confirma “Carnificina” no bucket “Vilões”. Reutiliza a identidade canônica já existente, com editora Marvel e universo Homem-Aranha; a proveniência registra a associação entre buckets. |
| `mdl_02dc01e233f1bbfc32d0` | Caveira Vermelha busto | Caveira Vermelha | Caveira Vermelha · Marvel | A API pública confirma o nome individual e o bucket “Vilões”; personagem distinto do nome da coleção. |
| `mdl_59ba05424d5384c585f8` | Caveira Vermelha diorama | Caveira Vermelha | Caveira Vermelha · Marvel | Segundo registro da API pública com o mesmo personagem; usa a identidade canônica única. |
| `mdl_b551d2f5cb5738a401cb` | Cull Obsidian | Cull Obsidian | Cull Obsidian · Marvel | A API confirma o nome; a coleção cita Thanos/Ordem Negra, mas o esquema não possui atributo de equipe para exibir essa relação como tag. |
| `mdl_6121865bdef26b48d37f` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel | Título individual e bucket Vilões confirmados pela API. |
| `mdl_14d33631c9b4e1f18d53` | Doutor Destino | Doutor Destino | Doutor Destino · Marvel | Título público reconciliado com Doctor Doom, reutilizando a identidade Marvel já criada e mantendo a distinção de Senhor Destino/Doctor Fate da DC. |
| `mdl_c957daed235c7e42439d` | Fauce de Ébano | Fauce de Ébano | Fauce de Ébano · Marvel | A API confirma o nome; a coleção cita Thanos/Ordem Negra, mas o esquema não possui atributo de equipe para exibir essa relação como tag. |
| `mdl_40cc984e7c0473df2387` | Gorr | Gorr | Gorr · Marvel | Título individual confirmado na API pública; sem universo adicional inferido. |
| `mdl_da206f0798844f83d459` | Juggernaut | Juggernaut | Juggernaut · Marvel | Título individual confirmado na API pública; sem universo adicional inferido. |
| `mdl_0263404bd838332d8a46` | Lady Letal | Lady Letal | Lady Letal · Marvel | Título individual confirmado na API pública; sem universo adicional inferido. |
| `mdl_f615fa037c553d00b60a` | Magneto | Magneto | Magneto · Marvel | Título individual confirmado na API pública; sem universo adicional inferido. |
| `mdl_d77549c36e9292f7245d` | Modok | Modok | Modok · Marvel | API confirma personagem individual; nome preservado como publicado no catálogo. |
| `mdl_5d1a1ff481db6d5190a8` | Próxima Meia-Noite | Próxima Meia-Noite | Próxima Meia-Noite · Marvel | API confirma personagem individual; coleção cita a Ordem Negra, mas a taxonomia de tags ainda não possui atributo de equipe. |
| `mdl_e81a3535b2bf4802819c` | Ronan | Ronan | Ronan · Marvel | Título individual confirmado na API pública. |
| `mdl_2ee0be18a42ef97c650c` | Thanos | Thanos | Thanos · Marvel | Identidade canônica compartilhada pelos oito modelos publicados com o nome Thanos na coleção. |
| `mdl_3a096fbb5d1eaf882522` | Thanos | Thanos | Thanos · Marvel | Segunda peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_5d6d1ad6663c03acd07d` | Thanos | Thanos | Thanos · Marvel | Terceira peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_6118c3157c6f7141191e` | Thanos | Thanos | Thanos · Marvel | Quarta peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_9bc57cd1890ec1d0f645` | Thanos | Thanos | Thanos · Marvel | Quinta peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_a6e19ccef69c33ae802c` | Thanos | Thanos | Thanos · Marvel | Sexta peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_d667d155f450b240ddf4` | Thanos | Thanos | Thanos · Marvel | Sétima peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_eef05d8cf15480dab97d` | Thanos | Thanos | Thanos · Marvel | Oitava peça da coleção Thanos; título e ID confirmados na API. |
| `mdl_f5244896766b44a5bfb5` | Abutre | Abutre | Abutre · Marvel · Homem-Aranha | API confirma nome e coleção; vínculo e atributos já existem em 0031 por instrução explícita do proprietário, sem duplicação na 0032. |
| `mdl_5bc659ffcbd1f6b7191e` | Adam Warlock | Adam Warlock | Adam Warlock · Marvel | Título individual confirmado na API; reutiliza a identidade canônica já sem duplicata. |
| `mdl_b513dc634e08c0b480b3` | Agente Venom | Agente Venom | Agente Venom · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Agente Venom confirmados pela API. |
| `mdl_73cc20bb867213405b66` | Anti-Venom | Anti-Venom | Anti-Venom · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Anti-Venom confirmados pela API. |
| `mdl_ecefa5a60b0f2646e483` | Anti-Venom | Anti-Venom | Anti-Venom · Marvel · Homem-Aranha | Segundo modelo Anti-Venom; mesmo personagem canônico, ID e título conferidos separadamente. |
| `mdl_0ddf22aace42077df2f0` | Aranha Escarlate | Aranha Escarlate | Aranha Escarlate · Marvel | Nome e coleção próprios confirmados pela API; sem universo adicional presumido. |
| `mdl_4c053fcb2d0dffb2ecbf` | Blade | Blade | Blade · Marvel | Título e coleção individual confirmados pela API. |
| `mdl_5ad326e9d50c917cec1a` | Blade | Blade | Blade · Marvel | Segundo modelo Blade; identidade canônica compartilhada, título confirmado individualmente. |
| `mdl_df795c42d3a25e5b4b4f` | Blade | Blade | Blade · Marvel | Terceiro modelo Blade; identidade canônica compartilhada, título confirmado individualmente. |
| `mdl_ac2b7f773900551345e2` | Cable | Cable | Cable · Marvel | Título individual e coleção coincidente confirmados pela API. |
| `mdl_5ae22a89da972a2623c4` | Camaleão | Camaleão | Camaleão · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Camaleão confirmados pela API. |
| `mdl_41a9d15b07d167aade22` | Capitão América | Capitão América | Capitão América · Marvel | Primeiro de cinco registros com título e coleção confirmados separadamente na API. |
| `mdl_5e995a66a78b1bfa81cc` | Capitão América | Capitão América | Capitão América · Marvel | Segundo dos cinco registros; mesma identidade individual. |
| `mdl_e771181439bc3c733bed` | Capitão América | Capitão América | Capitão América · Marvel | Terceiro dos cinco registros; mesma identidade individual. |
| `mdl_ed202714037c3cbe2114` | Capitão América | Capitão América | Capitão América · Marvel | Quarto dos cinco registros; mesma identidade individual. |
| `mdl_ff7b1599f6e09f516fb1` | Capitão América | Capitão América | Capitão América · Marvel | Quinto dos cinco registros; mesma identidade individual. |
| `mdl_19d715f2e7f87d2559b0` | Carnificina | Carnificina | Carnificina · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Carnificina confirmados; personagem canônico único. |
| `mdl_728cd766abb425ff41fa` | Carnificina | Carnificina | Carnificina · Marvel · Homem-Aranha | Segundo modelo; título e coleção confirmados individualmente. |
| `mdl_cec453cfa7155cc7e53c` | Carnificina | Carnificina | Carnificina · Marvel · Homem-Aranha | Terceiro modelo; título e coleção confirmados individualmente. |
| `mdl_af4e79ab1b1854699b86` | Cavaleiro da lua | Cavaleiro da Lua | Cavaleiro da Lua · Marvel | Nome confirmado na API; utiliza a identidade canônica existente sem forçar outra franquia. |
| `mdl_cd903f70701e58e1fc1b` | Cavaleiro da lua | Cavaleiro da Lua | Cavaleiro da Lua · Marvel | Segundo modelo; mesmo personagem, conferido por ID separado. |
| `mdl_03f752bfccb2f731995a` | Ciclope | Ciclope | Ciclope · Marvel | Título e coleção confirmados pela API; sem tag de equipe inferida. |
| `mdl_e3f20347f8844f262e8c` | Ciclope | Ciclope | Ciclope · Marvel | Segundo modelo Ciclope; título e coleção confirmados individualmente. |
| `mdl_e8b7dbb7a866acd3b7a1` | Ciclope | Ciclope | Ciclope · Marvel | Terceiro modelo Ciclope; título e coleção confirmados individualmente. |
| `mdl_ed82814e1b950e33465f` | Ciclope | Ciclope | Ciclope · Marvel | Quarto modelo Ciclope; título e coleção confirmados individualmente. |
| `mdl_edf8fc56a59b1b587f3d` | Ciclope | Ciclope | Ciclope · Marvel | Quinto modelo Ciclope; título e coleção confirmados individualmente. |
| `mdl_00a72955776c4d5cdd0c` | Coisa | Coisa | Coisa · Marvel | Título individual e coleção coincidente confirmados pela API. |
| `mdl_2af3651c51a2c84fc162` | Colossus | Colossus | Colossus · Marvel | Título individual e coleção coincidente confirmados pela API. |
| `mdl_29cffd7561426a065549` | Deadpool | Deadpool | Deadpool · Marvel | Título individual e coleção coincidente confirmados pela API. |
| `mdl_570b3486982cbe957f4c` | Deadpool | Deadpool | Deadpool · Marvel | Segundo modelo Deadpool; identidade canônica compartilhada após conferência do título/ID. |
| `mdl_6c0e9e5971d9623626d3` | Deadpool | Deadpool | Deadpool · Marvel | Terceiro modelo Deadpool; identidade canônica compartilhada após conferência do título/ID. |
| `mdl_01ff628d762b1f1cddd5` | Demolidor | Demolidor | Demolidor · Marvel | Primeiro de sete registros Demolidor, cada título/ID confirmado na API. |
| `mdl_083d3bc3ad66f40e51a8` | Demolidor | Demolidor | Demolidor · Marvel | Segundo dos sete modelos Demolidor. |
| `mdl_47d64d5326d5ec394de2` | Demolidor | Demolidor | Demolidor · Marvel | Terceiro dos sete modelos Demolidor. |
| `mdl_4cc22eb42fd13df06a21` | Demolidor | Demolidor | Demolidor · Marvel | Quarto dos sete modelos Demolidor. |
| `mdl_4ed92fe1249ffcd7b6cb` | Demolidor | Demolidor | Demolidor · Marvel | Quinto dos sete modelos Demolidor. |
| `mdl_f7fc82d9947ce5caa333` | Demolidor | Demolidor | Demolidor · Marvel | Sexto dos sete modelos Demolidor. |
| `mdl_fdba17f2c69398ba456c` | Demolidor | Demolidor | Demolidor · Marvel | Sétimo dos sete modelos Demolidor. |
| `mdl_00a81c101ba466e34e57` | Doutor Octopus | Doutor Octopus | Doutor Octopus · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Doutor Octopus confirmados pela API. |
| `mdl_494c48db754d22258e85` | Doutor Octopus | Doutor Octopus | Doutor Octopus · Marvel · Homem-Aranha | Segundo modelo; personagem e coleção conferidos por ID. |
| `mdl_687712d3dcbd80f7d2f0` | Doutor Octopus | Doutor Octopus | Doutor Octopus · Marvel · Homem-Aranha | Terceiro modelo; personagem e coleção conferidos por ID. |
| `mdl_960324bb4aa775f2abc2` | Doutor Octopus | Doutor Octopus | Doutor Octopus · Marvel · Homem-Aranha | Quarto modelo; personagem e coleção conferidos por ID. |
| `mdl_b1381150036f81520c04` | Doutor Octopus | Doutor Octopus | Doutor Octopus · Marvel · Homem-Aranha | Quinto modelo; personagem e coleção conferidos por ID. |
| `mdl_fb753fe96c65851a8bff` | Doutor Octopus | Doutor Octopus | Doutor Octopus · Marvel · Homem-Aranha | Sexto modelo; personagem e coleção conferidos por ID. |
| `mdl_405eb430d5b5db8a30dc` | Duende Macabro | Duende Macabro | Duende Macabro · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Duende Macabro confirmados pela API. |
| `mdl_8c562fc99b41cdbf9255` | Duende Verde | Duende Verde | Duende Verde · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Duende Verde confirmados pela API. |
| `mdl_fca0faf4da7ed5ac7e63` | Duende Verde | Duende Verde | Duende Verde · Marvel · Homem-Aranha | Segundo modelo; personagem canônico único e título conferido pela API. |
| `mdl_81d60f280bc8f5d793fb` | Electro | Electro | Electro · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Electro confirmados na API. |
| `mdl_0ae76945217d245f7cc2` | Elektra | Elektra | Elektra · Marvel | Título e coleção individual confirmados na API. |
| `mdl_1ad6261f97145d6d2d34` | Escorpião | Escorpião | Escorpião · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Escorpião confirmados na API. |
| `mdl_b5522d3311e777a86e01` | Escorpião | Escorpião | Escorpião · Marvel · Homem-Aranha | Segundo Escorpião; ID e coleção revisados separadamente. |
| `mdl_6b686ae19153de236599` | Gata Negra | Gata Negra | Gata Negra · Marvel | Título e coleção individual confirmados na API. |
| `mdl_a338e0b9376a98c4b406` | Gata Negra | Gata Negra | Gata Negra · Marvel | Segundo modelo Gata Negra; identidade compartilhada após revisão individual. |
| `mdl_25fa341a1057bffe1f26` | Gwenom | Gwenom | Gwenom · Marvel · Homem-Aranha | Título e coleção Homem-Aranha / Gwenom confirmados na API. |
| `mdl_a808f6ca6b72a913ffea` | Gwenom | Gwenom | Gwenom · Marvel · Homem-Aranha | Segundo Gwenom; ID e coleção verificados separadamente. |
| `mdl_91a15cde449664cad9bf` | Homem aranha agachado sobre destrocos | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; a pasta pública especifica Peter Parker. |
| `mdl_86e8fdf9507f471e4913` | Homem aranha agachado sobre pedestal | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; pasta Peter Parker; identidade canônica única. |
| `mdl_b1abf8fae08602a3a540` | Homem aranha coluna | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; pasta Peter Parker; identidade canônica única. |
| `mdl_89706a36bcb59491981c` | Homem aranha diorama dinamico com teias | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; pasta Peter Parker; identidade canônica única. |
| `mdl_7fdf2a485f9185f336b1` | Homem aranha diorama sobre destrocos | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; pasta Peter Parker; identidade canônica única. |
| `mdl_01c15193180e089f7081` | Homem aranha diorama traje escuro | Homem-Aranha | Homem-Aranha · Marvel | Título público nomeia Homem-Aranha; sem outros integrantes presumidos. |
| `mdl_1a575b0f98fd6070b11d` | Homem aranha e simbionte chibi | Homem-Aranha | Homem-Aranha · Marvel | Título nomeia Homem-Aranha; “simbionte” não aponta para um indivíduo específico. |
| `mdl_fe16eee3dc8cfc9ef3e7` | Homem aranha escalando parede diorama | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; pasta Peter Parker. |
| `mdl_a8af027b44385f0607aa` | Homem aranha estatua classica sobre estrutura | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; pasta Peter Parker. |
| `mdl_a8f7b0a5e65dff8375b3` | Homem aranha iron spider com patas mecanicas | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; Iron Spider é variante de traje, não outra identidade. |
| `mdl_2e7af7ab620772895384` | Homem aranha seis bracos estatua | Homem-Aranha | Homem-Aranha · Marvel | Título identifica Homem-Aranha; seis braços descrevem a variante. |
| `mdl_8629304b37c612d232ac` | Homem aranha vs doutor octopus 01 | Homem-Aranha · Doutor Octopus | Homem-Aranha · Marvel | Título nomeia dois personagens; a migration contém duas associações explícitas. |

| `mdl_71bd49ab4466775b6389` | Homem aranha vs doutor octopus 02 | Homem-Aranha · Doutor Octopus | Homem-Aranha · Marvel | Segundo diorama; título público nomeia ambos e mantém relações individuais. |
| `mdl_a86e2e6351a7c576b2a3` | Homem aranha vs duende verde diorama cinza | Homem-Aranha · Duende Verde | Homem-Aranha · Marvel | O título identifica os dois personagens; cor é variante do modelo. |
| `mdl_b3745e8bb0e5a0f30772` | Homem aranha vs duende verde diorama colorido | Homem-Aranha · Duende Verde | Homem-Aranha · Marvel | Segundo diorama com os mesmos dois nomes; relação por personagem. |
| `mdl_5d16747894856074a1bc` | Homem aranha vs rino diorama cinza | Homem-Aranha · Rino | Homem-Aranha · Marvel | O título identifica ambos; acabamento cinza é variante. |
| `mdl_f8f3006b5aef1c4fb378` | Homem aranha vs spawn diorama | Homem-Aranha · Spawn | Marvel · Image Comics | Título nomeia os dois; Spawn e editora confirmados na [página oficial da Image Comics](https://imagecomics.com/comics/series/spawn). |
| `mdl_d93e5a4959089c8130e1` | Homem aranha vs venom 01 | Homem-Aranha · Venom | Homem-Aranha · Marvel | Título nomeia ambos; relações separadas. |
| `mdl_d24c6ac29d0079eac67e` | Homem aranha vs venom 02 | Homem-Aranha · Venom | Homem-Aranha · Marvel | Segundo modelo; mesmos dois personagens, confirmados pelo título. |
| `mdl_9c79e52034abdfaeff8e` | Homem aranha vs venom 03 | Homem-Aranha · Venom | Homem-Aranha · Marvel | Terceiro modelo; mesmos dois personagens, confirmados pelo título. |
| `mdl_c335985e4f3daad584a0` | Homem de Ferro | Homem de Ferro | Homem de Ferro · Marvel | Título individual confirmado pela API. |
| `mdl_09a32dc4f79afa153236` | Homem-Aranha Noir | Homem-Aranha Noir | Homem-Aranha Noir · Marvel · Homem-Aranha | Título e pasta específicos confirmados. |
| `mdl_1cff0854e1176e48117b` | Homem-Aranha Simbionte | Homem-Aranha | Homem-Aranha · Marvel | Nomeia o personagem; “simbionte” não identifica outra pessoa. |
| `mdl_7d649ebba9d029adc46d` | Homem-Aranha Simbionte | Homem-Aranha | Homem-Aranha · Marvel | Segundo modelo; personagem e pasta confirmados separadamente. |
| `mdl_e8481952a07fe9ed81a3` | Homem-Aranha Simbionte | Homem-Aranha | Homem-Aranha · Marvel | Terceiro modelo; personagem e pasta confirmados separadamente. |
| `mdl_3c06eae4b8681083bf9a` | Homem-Areia | Homem-Areia | Homem-Areia · Marvel · Homem-Aranha | Título e pasta Homem-Aranha confirmados. |
| `mdl_67f8980b7015a48c042b` | Homem-Areia | Homem-Areia | Homem-Areia · Marvel · Homem-Aranha | Segundo modelo; ID revisado individualmente. |
| `mdl_f6afa5572c5f8486e56a` | Homem-Areia | Homem-Areia | Homem-Areia · Marvel · Homem-Aranha | Terceiro modelo; ID revisado individualmente. |
| `mdl_804ee7d381d6d4934532` | Hulk | Hulk | Hulk · Marvel | Título individual confirmado pela API. |
| `mdl_6f417b1ddd3a65c01796` | Hulk vs homem aranha | Hulk · Homem-Aranha | Hulk · Homem-Aranha · Marvel | Título nomeia os dois personagens, associados separadamente. |
| `mdl_008473b051312162bf23` | Justiceiro | Justiceiro | Justiceiro · Marvel | Primeiro de dez registros; título e pasta confirmados. |
| `mdl_3063ce18253a0138200a` | Justiceiro | Justiceiro | Justiceiro · Marvel | Segundo dos dez modelos Justiceiro. |
| `mdl_546d7204d5f3f749ff23` | Justiceiro | Justiceiro | Justiceiro · Marvel | Terceiro dos dez modelos Justiceiro. |
| `mdl_5ed2613c0f3fa6ea8189` | Justiceiro | Justiceiro | Justiceiro · Marvel | Quarto dos dez modelos Justiceiro. |
| `mdl_78f3fbb9b7d482451f0e` | Justiceiro | Justiceiro | Justiceiro · Marvel | Quinto dos dez modelos Justiceiro. |
| `mdl_7abc4820042a15e8d9ce` | Justiceiro | Justiceiro | Justiceiro · Marvel | Sexto dos dez modelos Justiceiro. |
| `mdl_7d4fb03af162faa65df6` | Justiceiro | Justiceiro | Justiceiro · Marvel | Sétimo dos dez modelos Justiceiro. |
| `mdl_7eecf6196ae98ade4e50` | Justiceiro | Justiceiro | Justiceiro · Marvel | Oitavo dos dez modelos Justiceiro. |
| `mdl_8cc80a868e73c9f39197` | Justiceiro | Justiceiro | Justiceiro · Marvel | Nono dos dez modelos Justiceiro. |
| `mdl_bdcfa794ee841c6b5caf` | Justiceiro | Justiceiro | Justiceiro · Marvel | Décimo dos dez modelos Justiceiro. |
| `mdl_bfac8ab6cee61405f65b` | Justiceiro | Justiceiro | Justiceiro · Marvel | Décimo primeiro modelo Justiceiro; ID confirmado separadamente. |
| `mdl_bb304fa47f0ae0e74a25` | Khonshu | Khonshu | Khonshu · Marvel | Nome e coleção individual confirmados pela API. |
| `mdl_9c8b517a04feacfc1b0b` | Lagarto | Lagarto | Lagarto · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Lagarto confirmados. |
| `mdl_f2e142bf64dcd456c200` | Lagarto | Lagarto | Lagarto · Marvel · Homem-Aranha | Segundo modelo; mesma identidade, ID verificado individualmente. |
| `mdl_86e044283659bf6962aa` | Logan cowboy | Wolverine | Wolverine · Marvel | Título diz Logan, e a pasta pública é Wolverine; reusa a identidade canônica sem duplicar. |
| `mdl_1db6c29e3902abbe42b2` | Loki | Loki | Loki · Marvel | Título individual e coleção coincidente confirmados pela API. |
| `mdl_068e03521d9b8c5bc209` | Mary Jane | Mary Jane | Mary Jane · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Mary Jane confirmados. |
| `mdl_f790f78f3904bea9b720` | Mary Jane | Mary Jane | Mary Jane · Marvel · Homem-Aranha | Segundo modelo; título e pasta conferidos individualmente. |
| `mdl_12754a2eca19c23236b6` | Miles Morales | Miles Morales | Miles Morales · Marvel · Homem-Aranha | Título e pasta individual confirmados pela API. |
| `mdl_5d066d25618bd40b1997` | Miles Morales | Miles Morales | Miles Morales · Marvel · Homem-Aranha | Segundo modelo Miles Morales; identidade canônica compartilhada. |
| `mdl_72704edb22dd42b016e7` | Miles Morales | Miles Morales | Miles Morales · Marvel · Homem-Aranha | Terceiro modelo Miles Morales; revisado pelo ID. |
| `mdl_b285509e8decc2f58c31` | Miles Morales | Miles Morales | Miles Morales · Marvel · Homem-Aranha | Quarto modelo Miles Morales; revisado pelo ID. |
| `mdl_cd76259fe2405e6ffa7d` | Mistério | Mistério | Mistério · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Mistério confirmados. |
| `mdl_081df23912f3cdd2cf9a` | Motoqueiro Fantasma | Motoqueiro Fantasma | Motoqueiro Fantasma · Marvel | Título e pasta individual confirmados pela API. |
| `mdl_2ff753109bc51750fc53` | Motoqueiro Fantasma | Motoqueiro Fantasma | Motoqueiro Fantasma · Marvel | Segundo modelo; personagem canônico compartilhado após conferência própria. |
| `mdl_89ba72fd3932dc7d9ed2` | Motoqueiro Fantasma | Motoqueiro Fantasma | Motoqueiro Fantasma · Marvel | Terceiro modelo; título e pasta confirmados por ID. |
| `mdl_9f7e59a0ddd24903d549` | Motoqueiro Fantasma | Motoqueiro Fantasma | Motoqueiro Fantasma · Marvel | Quarto modelo; título e pasta confirmados por ID. |
| `mdl_dcf47303bc83648f8304` | Motoqueiro Fantasma | Motoqueiro Fantasma | Motoqueiro Fantasma · Marvel | Quinto modelo; título e pasta confirmados por ID. |
| `mdl_e3b9fd0b9f9205650fc8` | Motoqueiro Fantasma | Motoqueiro Fantasma | Motoqueiro Fantasma · Marvel | Sexto modelo; título e pasta confirmados por ID. |
| `mdl_9025dd2316a011c67ddc` | Mulher Invisível | Mulher Invisível | Mulher Invisível · Marvel | Título individual confirmado pela API. |
| `mdl_4a2a6bbafb90066ece73` | Punho de Ferro | Punho de Ferro | Punho de Ferro · Marvel | Título individual confirmado pela API. |
| `mdl_5cd34c3c8c8a2c2487d7` | Punho de Ferro | Punho de Ferro | Punho de Ferro · Marvel | Segundo modelo; personagem canônico compartilhado após revisão individual. |
| `mdl_3f872aee54e62bc8b075` | Rei do Crime | Rei do Crime | Rei do Crime · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Rei do Crime confirmados. |
| `mdl_7c24b344bf22d898bb12` | Rei do Crime | Rei do Crime | Rei do Crime · Marvel · Homem-Aranha | Segundo modelo; título e pasta verificados individualmente. |
| `mdl_89559340e15a43fb2938` | Rei do Crime | Rei do Crime | Rei do Crime · Marvel · Homem-Aranha | Terceiro modelo; título e pasta verificados individualmente. |
| `mdl_10f0b8229ef8a8974a62` | Rino | Rino | Rino · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Rino confirmados. |
| `mdl_80f4408ea5f61aa0b121` | Rino | Rino | Rino · Marvel · Homem-Aranha | Segundo modelo; título e pasta conferidos separadamente. |
| `mdl_17ad94f783dbdc1af29a` | Senhor das Estrelas | Senhor das Estrelas | Senhor das Estrelas · Marvel | Nome individual confirmado pela API. |
| `mdl_97ba33fe02eaf0f9a009` | Sexteto sinistro diorama com homem aranha | Homem-Aranha | Homem-Aranha · Marvel | Só Homem-Aranha é identificado individualmente no título; integrantes do Sexteto não são nomeados. |
| `mdl_5244733850ff4c6dbf44` | Shocker | Shocker | Shocker · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Shocker confirmados. |
| `mdl_b9aea394f5e16640c413` | Shocker | Shocker | Shocker · Marvel · Homem-Aranha | Segundo modelo; título e pasta conferidos individualmente. |
| `mdl_c6867077730e79ec2b6a` | Spider-Gwen | Spider-Gwen | Spider-Gwen · Marvel · Homem-Aranha | Título e pasta Homem-Aranha / Spider-Gwen confirmados. |
| `mdl_2858d55b06e8416fd785` | Spider-Woman | Spider-Woman | Spider-Woman · Marvel · Homem-Aranha | Título e pasta individual confirmados. |
| `mdl_409cbc6d2ded2b153979` | Spider-Woman | Spider-Woman | Spider-Woman · Marvel · Homem-Aranha | Segundo modelo; identidade canônica compartilhada. |
| `mdl_509d3d9b8995ffe1c55d` | Spider-Woman | Spider-Woman | Spider-Woman · Marvel · Homem-Aranha | Terceiro modelo; identidade canônica compartilhada. |
| `mdl_d8a1479a9ee2c7745b59` | Valquíria | Valquíria | Valquíria · Marvel | Título individual confirmado pela API. |
| `mdl_0aec059bebe1cb16cec1` | Venom | Venom | Venom · Marvel · Homem-Aranha | Primeiro de nove registros Venom; título e pasta confirmados individualmente. |
| `mdl_0af32e2791190efcd1ed` | Venom | Venom | Venom · Marvel · Homem-Aranha | Segundo dos nove modelos Venom. |
| `mdl_1401e2621a1e4600dc21` | Venom | Venom | Venom · Marvel · Homem-Aranha | Terceiro dos nove modelos Venom. |
| `mdl_46ba1e5c8f5ce1a4549b` | Venom | Venom | Venom · Marvel · Homem-Aranha | Quarto dos nove modelos Venom. |
| `mdl_59147fd682f738a296cc` | Venom | Venom | Venom · Marvel · Homem-Aranha | Quinto dos nove modelos Venom. |
| `mdl_7161c55b8d9929f2f4d0` | Venom | Venom | Venom · Marvel · Homem-Aranha | Sexto dos nove modelos Venom. |
| `mdl_975f8daa22e7031fa8c8` | Venom | Venom | Venom · Marvel · Homem-Aranha | Sétimo dos nove modelos Venom. |
| `mdl_a05908753574387671ca` | Venom | Venom | Venom · Marvel · Homem-Aranha | Oitavo dos nove modelos Venom. |
| `mdl_f197fe45a2b353cf58e1` | Venom | Venom | Venom · Marvel · Homem-Aranha | Nono dos nove modelos Venom. |
| `mdl_117cc81eeedfd16243f5` | Wolverine | Wolverine | Wolverine · Marvel | Título individual confirmado pela API. |
| `mdl_192ad5b0f7ce80f13f70` | Wolverine | Wolverine | Wolverine · Marvel | Segundo modelo; mesma identidade canônica, ID confirmado separadamente. |
| `mdl_5c3065a90e33e340adab` | Mulher maravilha armadura com espada estatua cinza | Mulher-Maravilha | Mulher-Maravilha · DC | Título público identifica a personagem; armadura/espada são detalhes da peça. |
| `mdl_c89e72e2b419ab086032` | Mulher maravilha busto estatua cinza | Mulher-Maravilha | Mulher-Maravilha · DC | Título público identifica a personagem; acabamento cinza é variante. |
| `mdl_340885b8074e795a4b24` | Mulher maravilha classica busto e estatua cinza | Mulher-Maravilha | Mulher-Maravilha · DC | Mesmo personagem; estilo clássico/acabamento são contexto do modelo. |
| `mdl_82695e7e8610c47788e1` | Mulher maravilha classica com escudo e espada | Mulher-Maravilha | Mulher-Maravilha · DC | Título nomeia a personagem; escudo e espada são acessórios. |
| `mdl_4404dc11e00fae66d60c` | Mulher maravilha classica em pe sobre pedestal | Mulher-Maravilha | Mulher-Maravilha · DC | Título nomeia a personagem; pose/pedestal não alteram a identidade. |
| `mdl_d11392b4beb126340f39` | Mulher maravilha classica em pose sobre base | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; pose/base são contexto. |
| `mdl_87901dd5eac26722ad75` | Mulher maravilha classica sobre rochas | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; rochas são cenário da peça. |
| `mdl_4c03221d673c6431ce5f` | Mulher maravilha com escudo e espada em diorama | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; objetos do diorama não viram tags. |
| `mdl_1437614263b424880110` | Mulher maravilha com escudo estatua dupla vista | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; múltiplas vistas são variante de registro. |
| `mdl_0d890112a86c84371a2a` | Mulher maravilha com espada e escudo sobre destrocos | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; armas/destroços são detalhes da peça. |
| `mdl_6ab911e0897291b8db94` | Mulher maravilha em diorama com escudo e espada | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; adereços não representam outros personagens. |
| `mdl_7fc8c7c8970219cddae7` | Mulher maravilha erguendo espada sobre chamas | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; espada/chamas são pose e cenário. |
| `mdl_3a117c9c9b9ee9487e9d` | Mulher maravilha estatua cinza com capa e laco | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; capa/laço são aparência. |
| `mdl_6490416da0592b5a2df7` | Mulher maravilha estatua cinza com laco sobre pedestal | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; laço/base são detalhes do modelo. |
| `mdl_33988ac9f05dcb4f2e04` | Mulher maravilha estatua cinza sobre pedestal | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; acabamento/base não alteram a tag. |
| `mdl_a8d056f01ab65261739c` | Mulher maravilha estatua cinza tres vistas | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; três vistas são variante. |
| `mdl_7bca641a9af2f8063853` | Mulher maravilha estatua dourada com laco | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; dourado/laço são aparência. |
| `mdl_ddd90c6d7c23a05b7cec` | Mulher maravilha estilizada traje vermelho e preto | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; estilo/traje são contexto da peça. |
| `mdl_c947f55fc592b55475c4` | Mulher maravilha estilizada vista traseira | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; vista traseira é metadado de variante. |
| `mdl_789beecc2f6d021e2571` | Mulher maravilha halloween diana prince em cemiterio | Mulher-Maravilha | Mulher-Maravilha · DC | Nome Mulher-Maravilha confirmado pela API; DC registra Diana Prince como alias de Wonder Woman ([fonte oficial](https://www.dc.com/characters/wonder-woman)). |
| `mdl_33c0a632842ff82b3b98` | Mulher maravilha traje vermelho em diorama | Mulher-Maravilha | Mulher-Maravilha · DC | Título identifica a personagem; traje/cenário são detalhes. |
| `mdl_32f7b955e654edfe6cf4` | Anjo | Anjo | Anjo · Marvel · X-Men | Título e pasta X-Men/Anjo confirmados; Marvel identifica Warren Worthington III como Anjo/Angel. |
| `mdl_4154c6f93fc388d0870d` | Anjo | Anjo | Anjo · Marvel · X-Men | Segundo modelo Anjo; ID e pasta revistos individualmente. |
| `mdl_87557372c85bf90490b7` | Anjo | Anjo | Anjo · Marvel · X-Men | Terceiro modelo Anjo; identidade canônica compartilhada após conferência do registro. |
| `mdl_de815da2298fd27a7103` | Anjo | Anjo | Anjo · Marvel · X-Men | Quarto modelo Anjo; ID e pasta revistos individualmente. |
| `mdl_669befcb8b111d773237` | Apocalipse | Apocalipse | Apocalipse · Marvel · X-Men | Nome e pasta X-Men/vilões confirmados; mesma identidade canônica já usada em Vilões. |
| `mdl_82f3e259cdd182f80543` | Apocalipse | Apocalipse | Apocalipse · Marvel · X-Men | Segundo modelo; identidade compartilhada entre buckets sem duplicata. |
| `mdl_a0c4298cff8887872872` | Apocalipse | Apocalipse | Apocalipse · Marvel · X-Men | Terceiro modelo; título/pasta conferidos por ID. |
| `mdl_a4be7d5ed1abca87bd1c` | Apocalipse | Apocalipse | Apocalipse · Marvel · X-Men | Quarto modelo; título/pasta conferidos por ID. |
| `mdl_b9429757268a5a37dd8e` | Apocalipse | Apocalipse | Apocalipse · Marvel · X-Men | Quinto modelo; título/pasta conferidos por ID. |
| `mdl_dd0464e217596edec220` | Apocalipse | Apocalipse | Apocalipse · Marvel · X-Men | Sexto modelo; título/pasta conferidos por ID. |
| `mdl_8c8e83f850c0943068f8` | Arcanjo | Anjo | Anjo · Marvel · X-Men | Marvel lista Archangel como alias da mesma pessoa Warren Worthington; sem criar personagem duplicado. |
| `mdl_9975383bdbbf75bb27db` | Arcanjo | Anjo | Anjo · Marvel · X-Men | Segundo registro Arcanjo; usa a identidade canônica Anjo e o alias de busca. |
| `mdl_83ee5a2cedb05dfc3536` | Baby groot estatua cinza | Baby Groot | Baby Groot · Marvel · Guardiões da Galáxia | Título/folder e fonte oficial Marvel confirmam Baby Groot no contexto dos Guardiões. |
| `mdl_f8b16d62cdecf4b241d6` | Baby groot modelo promocional | Baby Groot | Baby Groot · Marvel · Guardiões da Galáxia | Segundo modelo; mesma forma/identidade Baby Groot, ID revisto separadamente. |
| `mdl_0207b026dbd348000d7c` | Bishop | Bishop | Bishop · Marvel · X-Men | Título e pasta X-Men/Bishop confirmados; fonte oficial Marvel confirma identidade e grupo. |
| `mdl_62651e9ddda36466a9fe` | Bishop | Bishop | Bishop · Marvel · X-Men | Segundo modelo Bishop; título/folder conferidos individualmente. |
| `mdl_069ff7ae88ed68324323` | Cable | Cable | Cable · Marvel · X-Men | Título e pasta X-Men/Cable confirmados; reutiliza identidade canônica. |
| `mdl_473bd05bc85c1bf85258` | Cable | Cable | Cable · Marvel · X-Men | Segundo modelo Cable; ID conferido individualmente. |
| `mdl_6206e796f5e853d395e3` | Cable | Cable | Cable · Marvel · X-Men | Terceiro modelo Cable; ID conferido individualmente. |
| `mdl_6b70ddd787a7e4145c46` | Cable | Cable | Cable · Marvel · X-Men | Quarto modelo Cable; ID conferido individualmente. |
| `mdl_a09411a787a8e07a45ec` | Cable | Cable | Cable · Marvel · X-Men | Quinto modelo Cable; ID conferido individualmente. |
| `mdl_c0eeedf3beeeee90dc1b` | Cable e deadpool | Cable · Deadpool | Cable · Deadpool · Marvel · X-Men | Título nomeia ambos; as relações individuais são separadas. Cable recebe X-Men pelo ramo público; Deadpool não recebe esse atributo. |
| `mdl_5d62b9a3c63e03ff6c42` | Capita marvel concept estatuas promocionais | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Título/pasta identificam Carol Danvers; fonte Marvel confirma personagem e afiliação. |
| `mdl_5922f4303ebbad62953c` | Capita marvel em voo com energia | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Segundo modelo; título e pasta Carol Danvers revisados por ID. |
| `mdl_bb7a92443b462a45ea92` | Capita marvel energia cosmica em diorama | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Terceiro modelo Capitã Marvel; identidade compartilhada. |
| `mdl_d4434bde56613a341e5d` | Capita marvel estatua cinza em voo | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Quarto modelo; título e pasta conferidos separadamente. |
| `mdl_988b2cda66e72db69c4d` | Capita marvel modelo cinza em base | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Quinto modelo; título e pasta conferidos separadamente. |
| `mdl_2420e5e6930c77e91803` | Capita marvel traje azul vermelho em pe | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Sexto modelo; traje/pose são variante da personagem. |
| `mdl_0017ff83a36cc8b223bd` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Primeiro de doze modelos; título e pasta Vingadores confirmados. |
| `mdl_063b65247fed12a2b5b3` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Segundo modelo; personagem canônico compartilhado. |
| `mdl_3310700bfea2d022d5ec` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Terceiro modelo; título/pasta verificados por ID. |
| `mdl_380a14bc077f4ddb3c32` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Quarto modelo; título/pasta verificados por ID. |
| `mdl_8cfdb9700aa2bc322f1b` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Quinto modelo; título/pasta verificados por ID. |
| `mdl_915efdeacc9fc9424d10` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Sexto modelo; título/pasta verificados por ID. |
| `mdl_98730ed13c7826542e54` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Sétimo modelo; título/pasta verificados por ID. |
| `mdl_a270b816c7560bc1be54` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Oitavo modelo; título/pasta verificados por ID. |
| `mdl_a8a92f3aea9a9771da85` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Nono modelo; título/pasta verificados por ID. |
| `mdl_cce6f68a7dd3180becc5` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Décimo modelo; título/pasta verificados por ID. |
| `mdl_d4b35f7d51fdd03a0973` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Décimo primeiro modelo; título/pasta verificados por ID. |
| `mdl_f554ad69161e7fdad053` | Capitão América | Capitão América | Capitão América · Marvel · Vingadores | Décimo segundo modelo; título/pasta verificados por ID. |
| `mdl_0441405b8bc01e01010c` | Charles Xavier | Charles Xavier | Charles Xavier · Marvel · X-Men | Título e pasta X-Men/Charles Xavier confirmados. |
| `mdl_16456c85d9bcbeee711a` | Charles Xavier | Charles Xavier | Charles Xavier · Marvel · X-Men | Segundo modelo; identidade canônica compartilhada. |
| `mdl_b269572707c3b35d24a7` | Charles Xavier | Charles Xavier | Charles Xavier · Marvel · X-Men | Terceiro modelo; título/pasta verificados por ID. |
| `mdl_055581aaf5df8cd9e6d4` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Título e pasta X-Men/Ciclope confirmados; reutiliza a identidade existente. |
| `mdl_085695571dd4346f149f` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Segundo modelo; título/pasta conferidos individualmente. |
| `mdl_14f75fc6e169e8d4dc2f` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Terceiro modelo; título/pasta conferidos individualmente. |
| `mdl_29922dce20c87b4b0572` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Quarto modelo; título/pasta conferidos individualmente. |
| `mdl_2d738a45f1e05a117d70` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Quinto modelo; título/pasta conferidos individualmente. |
| `mdl_3a664edc29c00a63d8eb` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Sexto Ciclope da coleção; título e ID confirmados. |
| `mdl_627197107b6ef9ba9074` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Sétimo modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_92f262c99aac7e67394b` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Oitavo modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_9f428d3888ee0874075a` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Nono modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_a57d288fb13e4f553df8` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Décimo modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_a8a1fa881853f377c86c` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Décimo primeiro modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_ac050a3dc99d183ccbfe` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Décimo segundo modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_c876cee3b202585be13f` | Ciclope | Ciclope | Ciclope · Marvel · X-Men | Décimo terceiro modelo Ciclope; título/pasta conferidos individualmente. |
| `mdl_00e2a361c019918aecb4` | Coisa | Coisa | Coisa · Marvel · Quarteto Fantástico | Título/pasta confirmados; Marvel oficial confirma Ben Grimm como membro do Quarteto. |
| `mdl_231f0c08a73861d8f0bb` | Coisa | Coisa | Coisa · Marvel · Quarteto Fantástico | Segundo modelo; mesma identidade, conferida pelo ID. |
| `mdl_e2d20938044ce2222a54` | Coisa | Coisa | Coisa · Marvel · Quarteto Fantástico | Terceiro modelo; mesma identidade, conferida pelo ID. |
| `mdl_fe505be5db159d9dbb68` | Coisa | Coisa | Coisa · Marvel · Quarteto Fantástico | Quarto modelo; mesma identidade, conferida pelo ID. |
| `mdl_4b780eac35abc084f80d` | Colossus | Colossus | Colossus · Marvel · X-Men | Título e pasta X-Men/Colossus confirmados. |
| `mdl_546b10121f0ec887862d` | Colossus | Colossus | Colossus · Marvel · X-Men | Segundo Colossus; identidade canônica compartilhada. |
| `mdl_703492a64047b588b983` | Colossus | Colossus | Colossus · Marvel · X-Men | Terceiro Colossus; título/pasta conferidos individualmente. |
| `mdl_8eeff1f666133b75251c` | Colossus | Colossus | Colossus · Marvel · X-Men | Quarto Colossus; título/pasta conferidos individualmente. |
| `mdl_9fa2f328b2ea33538d50` | Colossus | Colossus | Colossus · Marvel · X-Men | Quinto Colossus; título/pasta conferidos individualmente. |
| `mdl_e531d7641184dc0eda3e` | Colossus e Wolverine chibi | Colossus · Wolverine | Colossus · Wolverine · Marvel | O título nomeia os dois personagens; duas associações individuais. |
| `mdl_21f9ab8a9b5318a4d3fb` | Deadpool | Deadpool | Deadpool · Marvel | Título individual confirmado; o bucket/grupo por si só não gera chip de X-Men. |
| `mdl_2ddbfeda8e5ddf74f914` | Deadpool | Deadpool | Deadpool · Marvel | Segundo modelo Deadpool; título e ID conferidos individualmente. |

| `mdl_39e7e37ae991965efc61` | Deadpool | Deadpool | Deadpool · Marvel | Modelo revisado por ID na API pública; a pasta X-Men, sozinha, não prova vínculo de equipe. |
| `mdl_6e3b7887f73f98fa1717` | Deadpool | Deadpool | Deadpool · Marvel | Modelo Deadpool revisado individualmente; sem inferir associação X-Men pelo agrupamento. |
| `mdl_76a7515255a3163b30c1` | Deadpool | Deadpool | Deadpool · Marvel | Modelo Deadpool revisado individualmente por ID; associação explícita proposta em 0034. |
| `mdl_962fb16e3069caaeedb4` | Deadpool | Deadpool | Deadpool · Marvel | Modelo Deadpool revisado individualmente por ID; associação explícita proposta em 0034. |
| `mdl_b4d1b184fef6d84fc1f9` | Deadpool | Deadpool | Deadpool · Marvel | Modelo Deadpool revisado individualmente por ID; associação explícita proposta em 0034. |
| `mdl_b8c573b84931c7301197` | Deadpool | Deadpool | Deadpool · Marvel | Modelo Deadpool revisado individualmente por ID; associação explícita proposta em 0034. |
| `mdl_272f18274731e142ad75` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel · X-Men | Título e árvore de vilões X-Men; ficha oficial Marvel confirma o contexto X-Men. |
| `mdl_2fb4731f218c63e0b2c7` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel · X-Men | Segundo modelo, conferido por ID e pasta. |
| `mdl_3758b64d6967aaa0ccf0` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel · X-Men | Terceiro modelo, conferido por ID e pasta. |
| `mdl_658ed6136d83cd507d82` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel · X-Men | Quarto modelo, conferido por ID e pasta. |
| `mdl_69d20e94e29c85914553` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel · X-Men | Quinto modelo, conferido por ID e pasta. |
| `mdl_809e937a8bf00bcf074b` | Dentes de Sabre | Dentes de Sabre | Dentes de Sabre · Marvel · X-Men | Sexto modelo, conferido por ID e pasta. |
| `mdl_87f700ca51fc10539882` | Dominó | Dominó | Dominó · Marvel · X-Men | Ficha Marvel confirma Dominó como integrante do X-Force; catálogo a localiza no ramo X-Men. |
| `mdl_9b103a8c42f301075b3d` | Doutor Destino | Doutor Destino | Doutor Destino · Marvel · Quarteto Fantástico | Reutiliza Doctor Doom da Marvel, não Senhor Destino da DC; pasta identifica o núcleo de conflito. |
| `mdl_aea6bef782ecdb0f46fa` | Doutor Destino | Doutor Destino | Doutor Destino · Marvel · Quarteto Fantástico | Segundo modelo do vilão do Quarteto; ID conferido individualmente. |
| `mdl_b6ab78f1028b97eaf479` | Doutor Destino | Doutor Destino | Doutor Destino · Marvel · Quarteto Fantástico | Terceiro modelo do vilão do Quarteto; ID conferido individualmente. |
| `mdl_ea959f93829fbaf7ffbc` | Doutor Destino | Doutor Destino | Doutor Destino · Marvel · Quarteto Fantástico | Quarto modelo do vilão do Quarteto; ID conferido individualmente. |
| `mdl_05ea108fc0032f5f307c` | Doutor Estranho | Doutor Estranho | Doutor Estranho · Marvel · Vingadores | Título/pasta Vingadores e elenco oficial Marvel confirmam Stephen Strange. |
| `mdl_5bcb2035f108895d353c` | Doutor Estranho | Doutor Estranho | Doutor Estranho · Marvel · Vingadores | Segundo modelo; ID e pasta revisados separadamente. |
| `mdl_8a50a83d2ffc300f1230` | Doutor Estranho | Doutor Estranho | Doutor Estranho · Marvel · Vingadores | Terceiro modelo; ID e pasta revisados separadamente. |
| `mdl_bf3c85b52154d79ba4a0` | Doutor Estranho | Doutor Estranho | Doutor Estranho · Marvel · Vingadores | Quarto modelo; ID e pasta revisados separadamente. |
| `mdl_2d7a265bebe9adb27024` | Drax | Drax | Drax · Marvel · Guardiões da Galáxia | Pasta Guardians of the Galaxy/Drax e página oficial da equipe sustentam a tag. |
| `mdl_5f5953cbdc3a39536df3` | Duckpool estatua | Deadpool | Deadpool · Marvel | Variante nomeada de Deadpool; preservada identidade canônica, sem personagem duplicado. |
| `mdl_0bf08c10e35899205345` | Emma Frost | Emma Frost | Emma Frost · Marvel · X-Men | Título/pasta e ficha oficial Marvel confirmam personagem e vínculo. |
| `mdl_0feb3edd3cade8ae8d6a` | Emma Frost | Emma Frost | Emma Frost · Marvel · X-Men | Segundo modelo; ID e pasta revisados individualmente. |
| `mdl_404edb22ca6967b73b57` | Emma Frost | Emma Frost | Emma Frost · Marvel · X-Men | Terceiro modelo; ID e pasta revisados individualmente. |
| `mdl_9b848bf9a9a8c1da0bab` | Emma Frost | Emma Frost | Emma Frost · Marvel · X-Men | Quarto modelo; ID e pasta revisados individualmente. |
| `mdl_bbe0b39e832530f09731` | Emma Frost | Emma Frost | Emma Frost · Marvel · X-Men | Quinto modelo; ID e pasta revisados individualmente. |
| `mdl_2846e5d9cbbd30abb8e9` | Hulk vs juggernaut diorama | Hulk · Juggernaut | Hulk · Juggernaut · Marvel · Vingadores · X-Men | O título nomeia os dois; relações separadas; atributos de equipe sustentados pelas fontes oficiais e pastas. |
| `mdl_587e5e7ec50f747fffd4` | Hulk vs wolverine diorama colorido | Hulk · Wolverine | Hulk · Wolverine · Marvel · X-Men | O título nomeia ambos; relações individuais. Hulk/Vingadores e Wolverine/X-Men ficam em vínculos canônicos próprios. |
| `mdl_fd4a4ab0deab878edd88` | Hulk vs wolverine diorama com destroços | Hulk · Wolverine | Hulk · Wolverine · Marvel · X-Men | Segundo confronto; título nomeia ambos e recebe dois vínculos separados. |
| `mdl_081697edc0f36f131d74` | Hulkbuster | — (equipamento) | Aguardando taxonomia de equipamentos | Armadura, não personagem; não atribuir Iron Man apenas pelo nome da armadura. |
| `mdl_9409f6debd14b828bb10` | Hulkbuster | — (equipamento) | Aguardando taxonomia de equipamentos | Segundo registro da armadura; personagem não inferido. |
| `mdl_9455c9aa910f0ddcf546` | Hulkbuster | — (equipamento) | Aguardando taxonomia de equipamentos | Terceiro registro da armadura; personagem não inferido. |
| `mdl_4f7972d53b3b06439010` | Jane Foster | Jane Foster | Jane Foster · Marvel · Vingadores | Coleção pública Vingadores/Jane Foster; Marvel registra a personagem entre heroínas que serviram como Vingadora. |
| `mdl_7776f83ec5b1e3a1c764` | Jane Foster | Jane Foster | Jane Foster · Marvel · Vingadores | Segundo modelo; título e pasta revisados individualmente. |
| `mdl_2b4865a1234f4fcf4d13` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Título/pasta e roster oficial dos X-Men confirmam. |
| `mdl_2b6e0aa443c728752e5d` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Segundo modelo Jean Grey; ID revisado separadamente. |
| `mdl_2e9168139d49f8bf2304` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Terceiro modelo Jean Grey; ID revisado separadamente. |
| `mdl_3dc3334d332145a0d69c` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Quarto modelo Jean Grey; ID revisado separadamente. |
| `mdl_832710fc3258de8a355f` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Quinto modelo Jean Grey; ID revisado separadamente. |
| `mdl_8c5f0f18662de3c15090` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Sexto modelo Jean Grey; ID revisado separadamente. |
| `mdl_a1b19a09f174f3b4d1b0` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Sétimo modelo Jean Grey; ID revisado separadamente. |
| `mdl_b07e6f139bf40d77bdf5` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Oitavo modelo Jean Grey; ID revisado separadamente. |
| `mdl_c39bb637ee5c32c0225a` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Nono modelo Jean Grey; ID revisado separadamente. |
| `mdl_fd3c43c28a00e6c9461c` | Jean Grey | Jean Grey | Jean Grey · Marvel · X-Men | Décimo modelo Jean Grey; ID revisado separadamente. |
| `mdl_dc0b010cf4d5f6ee8c4e` | Jean grey e ciclope | Jean Grey · Ciclope | Jean Grey · Ciclope · Marvel · X-Men | O título nomeia ambos; o seed mantém duas relações, sem personagem composto. |
| `mdl_e4186b0c460d460150b0` | Jubileu | Jubileu | Jubileu · Marvel · X-Men | Título/pasta e perfil oficial Marvel de Jubilee confirmam. |
| `mdl_0103db191730eff9600b` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Título e pasta de vilões; história oficial dos X-Men confirma como adversário. |
| `mdl_293b0dd0f653f220cf00` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Segundo modelo Juggernaut; ID e pasta revisados. |
| `mdl_3b6ddb5fe7e7b645d0a3` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Terceiro modelo Juggernaut; ID e pasta revisados. |
| `mdl_606186469e9e63417669` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Quarto modelo Juggernaut; ID e pasta revisados. |
| `mdl_63fefad353aacafe2b1b` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Quinto modelo Juggernaut; ID e pasta revisados. |
| `mdl_6b25d42324e7d62c2e0c` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Sexto modelo Juggernaut; ID e pasta revisados. |
| `mdl_84c84f9efee44e225693` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Sétimo modelo Juggernaut; ID e pasta revisados. |
| `mdl_c1e6f6c9ea71292472c3` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Oitavo modelo Juggernaut; ID e pasta revisados. |
| `mdl_e21e87cd80d42a9529d2` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Nono modelo Juggernaut; ID e pasta revisados. |
| `mdl_e479420615bcfd655fc3` | Juggernaut | Juggernaut | Juggernaut · Marvel · X-Men | Décimo modelo Juggernaut; ID e pasta revisados. |
| `mdl_7ad57b284173f430ce73` | Juggernaut e colossus | Juggernaut · Colossus | Juggernaut · Colossus · Marvel · X-Men | O título nomeia os dois; dois vínculos individuais. |
| `mdl_7024e38b7de211a59c6d` | Kitty Pryde | Kitty Pryde | Kitty Pryde · Marvel · X-Men | Perfil oficial e pasta X-Men/Kitty Pryde confirmam. |
| `mdl_6049287e6d3f455a76bd` | Logan sem camisa com garras | Wolverine | Wolverine · Marvel · X-Men | Logan é alias da identidade canônica Wolverine/James Howlett; descrição de traje não vira tag. |
| `mdl_2e68b58620d11e03e1d6` | Madelyne | Madelyne | Madelyne · Marvel · X-Men | Título público é mantido sem expandir o nome; fonte Marvel e pasta X-Men sustentam identidade/contexto. |
| `mdl_221f3f3090389c694fd6` | Maestro | Maestro | Maestro · Marvel | Ficha oficial identifica Maestro como versão futura do Hulk; não se presume que seja integrante dos Vingadores. |
| `mdl_7b5c708bad4e14c77b73` | Maestro | Maestro | Maestro · Marvel | Segundo modelo Maestro; identidade revisada por ID. |
| `mdl_ec3421b4ea57a7667b21` | Maestro | Maestro | Maestro · Marvel | Terceiro modelo Maestro; identidade revisada por ID. |
| `mdl_0253debc7d16302e8aed` | Magia | Magia | Magia · Marvel · X-Men | “Magia” corresponde a Magik/Illyana Rasputin; roster oficial e pasta X-Men confirmam. |
| `mdl_18857d463c4db5b0fd80` | Magia | Magia | Magia · Marvel · X-Men | Segundo modelo Magia; ID e pasta revisados. |
| `mdl_34e248d2a59ddfcc7b0b` | Magia | Magia | Magia · Marvel · X-Men | Terceiro modelo Magia; ID e pasta revisados. |
| `mdl_613a7b65f2b7e3eb440c` | Magia | Magia | Magia · Marvel · X-Men | Quarto modelo Magia; ID e pasta revisados. |
| `mdl_7c76ead83f4d89402ae8` | Magia | Magia | Magia · Marvel · X-Men | Quinto modelo Magia; ID e pasta revisados. |
| `mdl_a58d3274014a9e536a13` | Magia | Magia | Magia · Marvel · X-Men | Sexto modelo Magia; ID e pasta revisados. |
| `mdl_4e4490599a12e4a72151` | Magneto | Magneto | Magneto · Marvel · X-Men | Título/pasta e história oficial Marvel identificam Magneto como primeiro inimigo dos X-Men. |
| `mdl_7e13f00e9f85b9b7a128` | Magneto | Magneto | Magneto · Marvel · X-Men | Segundo modelo Magneto; ID e pasta revisados individualmente. |
| `mdl_82f74cd1d69d839b5b31` | Magneto | Magneto | Magneto · Marvel · X-Men | Terceiro modelo Magneto; ID e pasta revisados individualmente. |
| `mdl_95fac75e1bccd40f4664` | Magneto | Magneto | Magneto · Marvel · X-Men | Quarto modelo Magneto; ID e pasta revisados individualmente. |
| `mdl_970952862a741f258853` | Magneto | Magneto | Magneto · Marvel · X-Men | Quinto modelo Magneto; ID e pasta revisados individualmente. |
| `mdl_b21a6c0c744c9ec2c9b1` | Magneto | Magneto | Magneto · Marvel · X-Men | Modelo no ramo de vilões X-Men; título, coleção e ID revistos. |
| `mdl_cda071fc75a89fc0fbe3` | Magneto | Magneto | Magneto · Marvel · X-Men | Segundo Magneto desta página; ID revisto separadamente. |
| `mdl_e607e6f0044f09ef0aba` | Magneto | Magneto | Magneto · Marvel · X-Men | Terceiro Magneto desta página; ID revisto separadamente. |
| `mdl_e6e4c42ab642764db034` | Magneto | Magneto | Magneto · Marvel · X-Men | Quarto Magneto desta página; ID revisto separadamente. |
| `mdl_f98c50cf1be6d288d7ed` | Magneto | Magneto | Magneto · Marvel · X-Men | Quinto Magneto desta página; ID revisto separadamente. |
| `mdl_fa6969bedf16355d91de` | Magneto | Magneto | Magneto · Marvel · X-Men | Sexto Magneto desta página; ID revisto separadamente. |
| `mdl_040dfb883db79238b4bc` | Magneto e Charles Xavier | Magneto · Charles Xavier | Magneto · Charles Xavier · Marvel · X-Men | Título identifica os dois; relações de personagem separadas. |
| `mdl_dd16a0ce57421ec5e6bc` | Magneto e Wolverine | Magneto · Wolverine | Magneto · Wolverine · Marvel · X-Men | Título identifica os dois; relações de personagem separadas. |
| `mdl_16919b02c3d3edb9fb8f` | Manopola do homem de ferro | — (equipamento) | Aguardando taxonomia de equipamentos | A manopla é objeto; não marcar Homem de Ferro como se fosse o personagem retratado. |
| `mdl_0e0c19c8641cbe692be4` | Mística | Mística | Mística · Marvel · X-Men | Título/pasta de vilões e perfil oficial Mystique confirmam a identidade. |
| `mdl_95859c2dafdb5da8f184` | Mística | Mística | Mística · Marvel · X-Men | Segundo modelo Mística; ID revisado separadamente. |
| `mdl_f4c013223c03a66220f7` | Mística | Mística | Mística · Marvel · X-Men | Terceiro modelo Mística; ID revisado separadamente. |
| `mdl_501237d0dcec93d1de23` | Ms Marvel Carol Danvers dupla vista | Capitã Marvel | Capitã Marvel · Marvel · Vingadores | Carol Danvers foi Ms. Marvel e é a identidade canônica Capitã Marvel; coleção confirma. |
| `mdl_5143bfda26aebc7a964` | Mulher hulk e demolidor diorama | Mulher-Hulk · Demolidor | Mulher-Hulk · Demolidor · Marvel | Título nomeia duas pessoas; vínculos separados. |
| `mdl_475691c2c8c8f644ca34` | Mulher Invisível | Mulher Invisível | Mulher Invisível · Marvel · Quarteto Fantástico | Roster oficial identifica Susan Storm Richards; coleção confirma. |
| `mdl_1a8c568259818b34a759` | Máquina de Combate | Máquina de Combate | Máquina de Combate · Marvel · Vingadores | Título e coleção Vingadores/Máquina de Combate conferidos. |
| `mdl_165389f6fc7cf32598ca` | Namor | Namor | Namor · Marvel · Quarteto Fantástico | Título/pasta; a coleção coloca Namor no ramo Quarteto Fantástico. |
| `mdl_401f49d0c38a85df4985` | Namor | Namor | Namor · Marvel · Quarteto Fantástico | Segundo Namor; ID e coleção revistos individualmente. |
| `mdl_a47a88a289b424281d8b` | Namor | Namor | Namor · Marvel · Quarteto Fantástico | Terceiro Namor; ID e coleção revistos individualmente. |
| `mdl_afbddbdddb9c760c8b8f` | Namor | Namor | Namor · Marvel · Quarteto Fantástico | Quarto Namor; ID e coleção revistos individualmente. |
| `mdl_0e2dfbd4ab0f1b730f2e` | Noturno | Noturno | Noturno · Marvel · X-Men | Título/pasta do X-Men; ID revisado. |
| `mdl_2f48c0a41da012d40c99` | Noturno | Noturno | Noturno · Marvel · X-Men | Segundo Noturno; ID revisto separadamente. |
| `mdl_ad99dc68407a1dcff666` | Noturno | Noturno | Noturno · Marvel · X-Men | Terceiro Noturno; ID revisto separadamente. |
| `mdl_cd914e0eeb182e88344d` | Noturno | Noturno | Noturno · Marvel · X-Men | Quarto Noturno; ID revisto separadamente. |
| `mdl_f37c242bd307490f67d7` | Noturno | Noturno | Noturno · Marvel · X-Men | Quinto Noturno; ID revisto separadamente. |
| `mdl_fa4c25c473d212fa5450` | Noturno | Noturno | Noturno · Marvel · X-Men | Sexto Noturno; ID revisto separadamente. |
| `mdl_058e35a1d2c210a32651` | Old man logan estatua | Wolverine | Wolverine · Marvel · X-Men | Old Man Logan é uma variante de Wolverine; identidade canônica reutilizada. |
| `mdl_0774df37842eed9b3b49` | Pantera Negra | Pantera Negra | Pantera Negra · Marvel · Vingadores | Título/coleção Vingadores e roster oficial confirmam. |
| `mdl_463f9ed1a8f7d5d785a6` | Pantera Negra | Pantera Negra | Pantera Negra · Marvel · Vingadores | Segundo Pantera Negra; ID revisto individualmente. |
| `mdl_518002adefd8eca31cb6` | Pantera Negra | Pantera Negra | Pantera Negra · Marvel · Vingadores | Terceiro Pantera Negra; ID revisto individualmente. |
| `mdl_73899810823611f6a404` | Pantera Negra | Pantera Negra | Pantera Negra · Marvel · Vingadores | Quarto Pantera Negra; ID revisto individualmente. |
| `mdl_acda6280da4a2a18aebd` | Planeta hulk contra criaturas captura mobile | Hulk | Hulk · Marvel · Vingadores | O título nomeia Hulk; as criaturas continuam sem nome/tag por falta de identificação individual. |
| `mdl_815f83c72a409a8a90ee` | Planeta hulk contra criaturas diorama | Hulk | Hulk · Marvel · Vingadores | O título nomeia Hulk; as criaturas genéricas não recebem identidades presumidas. |
| `mdl_7cbe10bd46207d837db0` | Planeta hulk diorama vista frontal | Hulk | Hulk · Marvel · Vingadores | Título e pasta Vingadores/Hulk confirmam o personagem; vista frontal é variante, não tag. |
| `mdl_60e115626579b002700e` | Polaris | Polaris | Polaris · Marvel · X-Men | Título/pasta de vilões X-Men; identidade confirmada. |
| `mdl_90d55976e3a9b686cab5` | Polaris | Polaris | Polaris · Marvel · X-Men | Segundo modelo Polaris; ID revisado separadamente. |
| `mdl_5bbefe3688d3803110dc` | Psylocke | Psylocke | Psylocke · Marvel · X-Men | Título/pasta e perfil oficial Marvel confirmam personagem. |
| `mdl_6a2c612e8754ed467c1f` | Psylocke | Psylocke | Psylocke · Marvel · X-Men | Segundo Psylocke; ID revisto individualmente. |
| `mdl_70c137b069f30070d769` | Psylocke | Psylocke | Psylocke · Marvel · X-Men | Terceiro Psylocke; ID revisto individualmente. |
| `mdl_a7d5a286de5cdaa8ce8c` | Psylocke | Psylocke | Psylocke · Marvel · X-Men | Quarto Psylocke; ID revisto individualmente. |
| `mdl_f3bb20ee8cf44703a804` | Psylocke | Psylocke | Psylocke · Marvel · X-Men | Quinto Psylocke; ID revisto individualmente. |
| `mdl_f514513600ca81a5b473` | Psylocke | Psylocke | Psylocke · Marvel · X-Men | Sexto Psylocke; ID revisto individualmente. |
| `mdl_04856a7efd88ac7d7075` | Quarteto fantastico grupo diorama | — (grupo não identificado) | Aguardando identificação visual | O título só diz “grupo”; conferir imagens para cadastrar cada membro em tag separada. |
| `mdl_4599a7e74b0a024dafd4` | Red Hulk | Red Hulk | Red Hulk · Marvel · Vingadores | Personagem distinto de Bruce Banner: a ficha oficial identifica Red Hulk como Thaddeus Ross. |
| `mdl_4cd6508e75edbda26f62` | Red Hulk | Red Hulk | Red Hulk · Marvel · Vingadores | Segundo Red Hulk; não fundir com a identidade Hulk/Bruce Banner. |
| `mdl_db2a80ba704cbf52682f` | Red Hulk | Red Hulk | Red Hulk · Marvel · Vingadores | Terceiro Red Hulk; ID e pasta revisados. |
| `mdl_52dbed8cc17ad01bf41d` | Rocket | Rocket | Rocket · Marvel · Guardiões da Galáxia | Título/pasta e fontes oficiais confirmam a equipe dos Guardiões. |
| `mdl_4958207a1574d925fc3e` | Senhor Fantástico | Senhor Fantástico | Senhor Fantástico · Marvel · Quarteto Fantástico | Roster oficial identifica Reed Richards; coleção confirma. |
| `mdl_328834e473fbe320183f` | Senhor Sinistro | Senhor Sinistro | Senhor Sinistro · Marvel · X-Men | Título/pasta e perfil oficial Marvel confirmam Nathaniel Essex/Mister Sinister. |
| `mdl_5233362029e6a03e398c` | Senhor Sinistro | Senhor Sinistro | Senhor Sinistro · Marvel · X-Men | Segundo modelo; ID e pasta revistos separadamente. |
| `mdl_5da358e13b93bab1a5d3` | Senhor Sinistro | Senhor Sinistro | Senhor Sinistro · Marvel · X-Men | Terceiro modelo; ID e pasta revistos separadamente. |
| `mdl_98258a877c2fa162f738` | Senhor Sinistro | Senhor Sinistro | Senhor Sinistro · Marvel · X-Men | Quarto modelo; ID e pasta revistos separadamente. |
| `mdl_7d6c24918db1b2dc2c14` | Sentinela | — (classe de robô) | Aguardando taxonomia de entidades não humanas | “Sentinela” não identifica uma unidade/personagem individual; requer tipo de entidade próprio ou inspeção da imagem. |
| `mdl_7750a95a403d293cba4e` | She hulk com martelo e peso diorama | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Jennifer Walters; martelo e pesos são detalhes visuais, não tags. |
| `mdl_e3e5091ade2d538ced4f` | She hulk com peso em base de academia | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Segundo modelo Mulher-Hulk; o equipamento de academia não altera o nome da personagem. |
| `mdl_78b7d799c772852461d2` | She hulk em pe com martelo estatua | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Terceiro modelo; martelo/pose ficam fora das tags. |
| `mdl_5144cd47ca1f542e59c3` | She hulk jennifer walters dupla versao | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Nome público e identidade Jennifer Walters confirmados; não duplicar por duas versões. |
| `mdl_0e2b3a642644b70d1e97` | She hulk levantando barra com pesos modelo cinza | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Quinto modelo; pose e pesos não viram tags. |
| `mdl_597b695ca1a08e686930` | She hulk levantando rocha estatua | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Sexto modelo; rocha/pose não viram tags. |
| `mdl_0ce952bd49444be23cf6` | She hulk modelo 3d tres vistas | Mulher-Hulk | Mulher-Hulk · Marvel · Vingadores | Sétimo modelo; três vistas são apresentação, não variantes de personagem. |
| `mdl_ee1c274b7117ec337175` | Skaar | Skaar | Skaar · Marvel | Título e pasta Vingadores/Hulk/Skaar identificam a pessoa; não confundir com Bruce Banner. |
| `mdl_052cc60f912f9850657c` | Star-Lord | Star-Lord | Star-Lord · Marvel · Guardiões da Galáxia | Perfil oficial e coleção Guardianos da Galáxia confirmam. |
| `mdl_435c48d6ccf537e20299` | Star-Lord | Star-Lord | Star-Lord · Marvel · Guardiões da Galáxia | Segundo Star-Lord; ID e pasta revistos. |
| `mdl_b5c9468b5f521229da7b` | Star-Lord | Star-Lord | Star-Lord · Marvel · Guardiões da Galáxia | Terceiro Star-Lord; ID e pasta revistos. |
| `mdl_ca56ba567faf213b881f` | Star-Lord | Star-Lord | Star-Lord · Marvel · Guardiões da Galáxia | Quarto Star-Lord; ID e pasta revistos. |
| `mdl_449593a4092e1ddf177b` | Super-Skrull | Super-Skrull | Super-Skrull · Marvel · Quarteto Fantástico | Perfil oficial identifica Kl’rt; coleção coloca o vilão no ramo do Quarteto. |
| `mdl_324784c48fe5baf8fdfd` | Surfista Prateado | Surfista Prateado | Surfista Prateado · Marvel · Quarteto Fantástico | Personagem e coleção identificados separadamente. |
| `mdl_33fa44c9d44a147a73dd` | Surfista Prateado | Surfista Prateado | Surfista Prateado · Marvel · Quarteto Fantástico | Segundo Surfista Prateado; ID revisto separadamente. |
| `mdl_4ea60b1daf3f1cc2ed1b` | Surfista Prateado | Surfista Prateado | Surfista Prateado · Marvel · Quarteto Fantástico | Terceiro Surfista Prateado; ID revisto separadamente. |
| `mdl_a4e161c3c538328fa39c` | Surfista Prateado | Surfista Prateado | Surfista Prateado · Marvel · Quarteto Fantástico | Quarto Surfista Prateado; ID revisto separadamente. |
| `mdl_af0d8d4e151aab32a8ac` | Surfista Prateado | Surfista Prateado | Surfista Prateado · Marvel · Quarteto Fantástico | Quinto Surfista Prateado; ID revisto separadamente. |
| `mdl_113605b916d1a2bf12a8` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Perfil oficial Marvel e pasta X-Men confirmam. |
| `mdl_374442131921dd983741` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Segundo modelo Tempestade; ID revisto individualmente. |
| `mdl_6021eb20ddff05f8232f` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Terceiro modelo Tempestade; ID revisto individualmente. |
| `mdl_8e1922092d90882cfdb0` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Quarto modelo Tempestade; ID revisto individualmente. |
| `mdl_96a207c1f9ecb88d59f8` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Quinto modelo Tempestade; ID revisto individualmente. |
| `mdl_a27d68e07e0ad146b481` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Sexto modelo Tempestade; ID revisto individualmente. |
| `mdl_a8a64ab3a228a6141761` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Sétimo modelo Tempestade; ID revisto individualmente. |
| `mdl_d2d8a6142d5637c4e459` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Oitavo modelo Tempestade; ID revisto individualmente. |
| `mdl_dcaa58e55c4cf1c511d4` | Tempestade | Tempestade | Tempestade · Marvel · X-Men | Nono modelo Tempestade; ID revisto individualmente. |
| `mdl_01afcbc3930b77262b5a` | Thor | Thor | Thor · Marvel · Vingadores | Título/pasta e roster oficial dos Vingadores confirmam. |
| `mdl_336deef62c9b3c842cf3` | Thor | Thor | Thor · Marvel · Vingadores | Segundo Thor; ID e coleção revistos. |
| `mdl_4192f8e7cf69d8a57b4f` | Thor | Thor | Thor · Marvel · Vingadores | Terceiro Thor; ID e coleção revistos. |
| `mdl_4cd23369fd7eeb43a014` | Thor | Thor | Thor · Marvel · Vingadores | Quarto Thor; ID e coleção revistos. |
| `mdl_50772c32facae6b73c2c` | Thor | Thor | Thor · Marvel · Vingadores | Quinto Thor; ID e coleção revistos. |
| `mdl_79770ecd35b052603117` | Thor | Thor | Thor · Marvel · Vingadores | Sexto Thor; ID e coleção revistos. |
| `mdl_8df0009720051d6ed490` | Thor | Thor | Thor · Marvel · Vingadores | Sétimo Thor; ID e coleção revistos. |
| `mdl_957e7cda48da02d28c6f` | Thor | Thor | Thor · Marvel · Vingadores | Oitavo Thor; ID e coleção revistos. |
| `mdl_a63899a9010b5c839f72` | Thor | Thor | Thor · Marvel · Vingadores | Nono Thor; ID e coleção revistos. |
| `mdl_a74b2cff2fd4c56e305b` | Thor | Thor | Thor · Marvel · Vingadores | Décimo Thor; ID e coleção revistos. |
| `mdl_a9afa21a18f131d45a36` | Thor | Thor | Thor · Marvel · Vingadores | Décimo primeiro Thor; ID e coleção revistos. |
| `mdl_aa941eed3ba1a8196c6e` | Thor | Thor | Thor · Marvel · Vingadores | Décimo segundo Thor; ID e coleção revistos. |
| `mdl_b6e0680da954bb5ef07f` | Thor | Thor | Thor · Marvel · Vingadores | Décimo terceiro Thor; ID e coleção revistos. |
| `mdl_baa5a95a50ac45dea8f8` | Thor | Thor | Thor · Marvel · Vingadores | Décimo quarto Thor; ID e coleção revistos. |
| `mdl_c7332b16b09f481e7481` | Thor | Thor | Thor · Marvel · Vingadores | Décimo quinto Thor; ID e coleção revistos. |
| `mdl_ddb55c4397ac05307d06` | Thor | Thor | Thor · Marvel · Vingadores | Décimo sexto Thor; ID e coleção revistos. |
| `mdl_ebf4a8425c77b98203cc` | Thor | Thor | Thor · Marvel · Vingadores | Décimo sétimo modelo Thor na coleção Vingadores/Thor; ID conferido. |
| `mdl_2a7c327c1ec173b4ada7` | Tocha Humana | Tocha Humana | Tocha Humana · Marvel · Quarteto Fantástico | Roster oficial confirma Johnny Storm; coleção Tocha Humana. |
| `mdl_192f5a49152b7c2e8c07` | Vampira | Vampira | Vampira · Marvel · X-Men | Nome localizado de Rogue; roster oficial e pasta X-Men confirmam identidade. |
| `mdl_5ea2fc775ba4ca8097ff` | Vampira | Vampira | Vampira · Marvel · X-Men | Segundo modelo Vampira; ID revisto separadamente. |
| `mdl_697585bf0bb93634a702` | Vampira | Vampira | Vampira · Marvel · X-Men | Terceiro modelo Vampira; ID revisto separadamente. |
| `mdl_9541e0e9c6a51f8cf778` | Vampira | Vampira | Vampira · Marvel · X-Men | Quarto modelo Vampira; ID revisto separadamente. |
| `mdl_a35dc03796e409f3d2e0` | Vampira | Vampira | Vampira · Marvel · X-Men | Quinto modelo Vampira; ID revisto separadamente. |
| `mdl_a5d75a7087fda69fd3ac` | Vampira | Vampira | Vampira · Marvel · X-Men | Sexto modelo Vampira; ID revisto separadamente. |
| `mdl_e3d39c635f7c167a926b` | Vampira | Vampira | Vampira · Marvel · X-Men | Sétimo modelo Vampira; ID revisto separadamente. |
| `mdl_f331c2c64b5ff322429b` | Vampira | Vampira | Vampira · Marvel · X-Men | Oitavo modelo Vampira; ID revisto separadamente. |
| `mdl_fea4e94b387f05e45fd5` | Vampira | Vampira | Vampira · Marvel · X-Men | Nono modelo Vampira; ID revisto separadamente. |
| `mdl_da9c02d86cbbf8432e1b` | Venom Hulk | Hulk · Venom | Hulk · Venom · Marvel | Título composto foi separado em duas relações canônicas; Hulk não absorve a identidade Venom. |
| `mdl_0d6360ea803486785538` | Visão | Visão | Visão · Marvel · Vingadores | História oficial identifica Vision como Avenger; coleção Visão confirma. |
| `mdl_4710e2f2a97d7b949f53` | Visão | Visão | Visão · Marvel · Vingadores | Segundo Visão; ID e coleção revistos separadamente. |
| `mdl_5eab095f7549e8054ca1` | Viúva Negra | Viúva Negra | Viúva Negra · Marvel · Vingadores | Roster oficial dos Vingadores confirma Natasha Romanoff/Black Widow. |
| `mdl_74c1319ab8c8ff08db4f` | Viúva Negra | Viúva Negra | Viúva Negra · Marvel · Vingadores | Segundo modelo; ID revisado separadamente. |
| `mdl_835588bf5e98e77b6f03` | Viúva Negra | Viúva Negra | Viúva Negra · Marvel · Vingadores | Terceiro modelo; ID revisado separadamente. |
| `mdl_a27143b91a477674454d` | Viúva Negra | Viúva Negra | Viúva Negra · Marvel · Vingadores | Quarto modelo; ID revisado separadamente. |
| `mdl_e43e63e3190f10bf3214` | Viúva Negra | Viúva Negra | Viúva Negra · Marvel · Vingadores | Quinto modelo; ID revisado separadamente. |
| `mdl_42e8a9b2a0389f999b94` | Wanda estatua vermelha em base de energia | Feiticeira Escarlate | Feiticeira Escarlate · Marvel · Vingadores | Wanda é a personagem; cor/energia são detalhes da estátua. |
| `mdl_bb7a2c09fc1169b1e78e` | Wanda traje vermelho com magia em diorama | Feiticeira Escarlate | Feiticeira Escarlate · Marvel · Vingadores | Mesmo personagem; traje e magia do diorama não criam tags novas. |
| `mdl_d043b5a510b35d439ba7` | Warpath | Warpath | Warpath · Marvel · X-Men | Perfil oficial identifica James Proudstar; fonte Marvel e pasta confirmam contexto mutante. |
| `mdl_01097769095f4d73cb18` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Primeiro dos 26 modelos Wolverine da página; ID/pasta revistos. |
| `mdl_08d88c9d9cd39758b575` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Segundo modelo Wolverine; ID/pasta revistos. |
| `mdl_23869ae3149d43b42a7a` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Terceiro modelo Wolverine; ID/pasta revistos. |
| `mdl_2f5e3899b7c8c974a06f` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Quarto modelo Wolverine; ID/pasta revistos. |
| `mdl_2fe8192a21df84564743` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Quinto modelo Wolverine; ID/pasta revistos. |
| `mdl_43069b20371abe5fc072` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Sexto modelo Wolverine; ID/pasta revistos. |
| `mdl_46f8c2e0c830ae929094` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Sétimo modelo Wolverine; ID/pasta revistos. |
| `mdl_5afe38d6422e71732859` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Oitavo modelo Wolverine; ID/pasta revistos. |
| `mdl_5b0a0555993ae6275c91` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Nono modelo Wolverine; ID/pasta revistos. |
| `mdl_66197d7f900d022a4ace` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo modelo Wolverine; ID/pasta revistos. |
| `mdl_80720ca0806800aaada3` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo primeiro modelo Wolverine; ID/pasta revistos. |
| `mdl_90f401c38862bc331dc2` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo segundo modelo Wolverine; ID/pasta revistos. |
| `mdl_996ac70a1cbbc7535f8e` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo terceiro modelo Wolverine; ID/pasta revistos. |
| `mdl_9f1f717547bb28b0d81f` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo quarto modelo Wolverine; ID/pasta revistos. |
| `mdl_a7fdc591346ace0f879d` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo quinto modelo Wolverine; ID/pasta revistos. |
| `mdl_adb15d71b78a1492e028` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo sexto modelo Wolverine; ID/pasta revistos. |
| `mdl_b3f43678ccb99b15d614` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo sétimo modelo Wolverine; ID/pasta revistos. |
| `mdl_b594ad3721879ff4c1f5` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo oitavo modelo Wolverine; ID/pasta revistos. |
| `mdl_b78b3528dcc526dda5aa` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Décimo nono modelo Wolverine; ID/pasta revistos. |
| `mdl_b9a1919c7a52253de81a` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo modelo Wolverine; ID/pasta revistos. |
| `mdl_c06aff20c39ab2a390a6` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo primeiro modelo Wolverine; ID/pasta revistos. |
| `mdl_c49b530059713875a3aa` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo segundo modelo Wolverine; ID/pasta revistos. |
| `mdl_ccd630b33f6c409032e7` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo terceiro modelo Wolverine; ID/pasta revistos. |
| `mdl_db7d00f32692b0858f85` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo quarto modelo Wolverine; ID/pasta revistos. |
| `mdl_e0551fe4bde6190d9d8f` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo quinto modelo Wolverine; ID/pasta revistos. |
| `mdl_e75d913a593c54c7d51a` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo sexto modelo Wolverine; ID/pasta revistos. |
| `mdl_e9a0606f0efbc4023786` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo sétimo modelo Wolverine na coleção; ID e pasta X-Men conferidos. |
| `mdl_ec953a96095732c4a0b1` | Wolverine | Wolverine | Wolverine · Marvel · X-Men | Vigésimo oitavo modelo Wolverine na coleção; ID e pasta conferidos. |
| `mdl_e4d356f2c4ee0a92e6a9` | Wolverine e deadpool | Wolverine · Deadpool | Wolverine · Deadpool · Marvel · X-Men | Título nomeia os dois; associações individuais. |
| `mdl_b52267d66b29b887ce6b` | Wolverine sobre dentes de sabre | Wolverine · Dentes de Sabre | Wolverine · Dentes de Sabre · Marvel · X-Men | Título nomeia ambos; cada personagem tem relação própria. |
| `mdl_755b6b252b7f1173ecdd` | Wolverine vs capitao america | Wolverine · Capitão América | Wolverine · Capitão América · Marvel · Vingadores · X-Men | Confronto entre franquias nomeia os dois; tags individuais no seed. |
| `mdl_d076960a81de17fdfcd3` | Wolverine vs dentes de sabre 01 | Wolverine · Dentes de Sabre | Wolverine · Dentes de Sabre · Marvel · X-Men | Título nomeia ambos; primeiro diorama do par, relações separadas. |
| `mdl_d52f8a6a9bc02f1f2323` | Wolverine vs dentes de sabre 02 | Wolverine · Dentes de Sabre | Wolverine · Dentes de Sabre · Marvel · X-Men | Segundo diorama do mesmo confronto; dois vínculos individuais. |
| `mdl_b634f75d8f134d824290` | Wolverine vs hulk | Wolverine · Hulk | Wolverine · Hulk · Marvel · X-Men · Vingadores | Título nomeia ambos; relações individuais separadas. |
| `mdl_6cdf79e1a0c624e29091` | Wolverine vs hulk diorama colorido | Wolverine · Hulk | Wolverine · Hulk · Marvel · X-Men · Vingadores | Segundo confronto; cores/variante não mudam os personagens. |
| `mdl_699128768fe432f39c35` | Wolverine vs omega red | Wolverine · Ômega Red | Wolverine · Ômega Red · Marvel · X-Men | Título nomeia ambos; personagem de cada lado separado. |
| `mdl_eb8b36c11b31b9fb8e03` | X23 estatua cinza em diorama | X-23 | X-23 · Marvel · X-Men | Personagem X-23; cor/estátua não vira tag. |
| `mdl_b460ad7dd3d9da6c6130` | X23 estatua cinza sobre base | X-23 | X-23 · Marvel · X-Men | Segundo X-23; ID revisto individualmente. |
| `mdl_9ab2ad4f3188edddc838` | X23 traje azul e amarelo dupla vista | X-23 | X-23 · Marvel · X-Men | Terceiro X-23; duas vistas são apresentação da mesma personagem. |
| `mdl_11f9d8a6696c13c1f996` | X23 traje azul e amarelo em acao | X-23 | X-23 · Marvel · X-Men | Quarto X-23; traje/ação não alteram o nome da tag. |
| `mdl_04de07e0be5f3d02d980` | Yondu | Yondu | Yondu · Marvel · Guardiões da Galáxia | Título e coleção; identidade canônica individual. |
| `mdl_d6514ebd4c39880a8771` | Yondu | Yondu | Yondu · Marvel · Guardiões da Galáxia | Segundo Yondu; ID revisto separadamente. |
| `mdl_2244c0b3c8f8ff1fb2fa` | Ômega Red | Ômega Red | Ômega Red · Marvel · X-Men | Perfil oficial e pasta de vilões X-Men confirmam. |
| `mdl_44ee1465446e0754159c` | Ômega Red | Ômega Red | Ômega Red · Marvel · X-Men | Segundo Ômega Red; ID e coleção conferidos. |
| `mdl_cea55f7f13dcaa99ebb3` | Aquaman classico com tridente sobre base | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; personagem confirmado por [perfil oficial DC](https://www.dc.com/characters/aquaman); relação explícita em 0041. |
| `mdl_27c9132c0b1fbf8766e8` | Aquaman com tridente e dragao marinho em diorama | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; dragão marinho é contexto do diorama; [perfil oficial DC](https://www.dc.com/characters/aquaman). |
| `mdl_ede7d556559b2d436f30` | Aquaman com tridente e monstro marinho em diorama | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; monstro marinho é contexto do diorama; [perfil oficial DC](https://www.dc.com/characters/aquaman). |
| `mdl_35d9b756ce015ab48995` | Aquaman estatua cinza com tridente | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; cor e tridente são detalhes do modelo. |
| `mdl_2de3cc68b34dfe13af99` | Aquaman modelo cinza tres vistas com tridente | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; vistas múltiplas continuam sendo uma identidade. |
| `mdl_df7b9a1a71cb2ccd957d` | Aquaman montado em cavalo marinho | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; montaria não é personagem nomeada. |
| `mdl_0c9cd42d049a330f24d0` | Aquaman montado em tubarao em diorama | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; tubarão não foi criado como personagem sem nome próprio. |
| `mdl_ac83ea86bb27b04ef3fe` | Aquaman sentado no trono com tridente | Aquaman | Aquaman · DC | Título da API pública identifica Aquaman; trono e tridente são detalhes do modelo. |
| `mdl_a6535ea2b5095114abce` | Arraia Negra | Arraia Negra | Aquaman · DC | Título da API pública identifica a personagem; [perfil oficial DC](https://www.dc.com/characters/black-manta) confirma Black Manta como inimigo de Aquaman. |
| `mdl_5cb1a7c25d077cd52209` | Jessica Cruz | Jessica Cruz | Lanterna Verde · DC | Título da API identifica a personagem; [perfil oficial DC](https://www.dc.com/characters/jessica-cruz); relação explícita em 0042. |
| `mdl_b3d0a7390ef896e06a73` | Jessica Cruz | Jessica Cruz | Lanterna Verde · DC | Segundo modelo da personagem, revisado por ID; [perfil oficial DC](https://www.dc.com/characters/jessica-cruz). |
| `mdl_540b45a077abf5eb808a` | Lanterna verde em diorama de energia cristalina | — | Lanterna Verde · DC | Retido: a imagem mostra um Lanterna Verde, mas não confirma individualmente a identidade entre membros do Corpo. |
| `mdl_6a07db116671a7328146` | Lanterna verde estatua cinza com lanterna e capa | — | Lanterna Verde · DC | Retido: uniforme e bateria não identificam com segurança a pessoa; a imagem pode representar Alan Scott ou outro Lanterna. |
| `mdl_620317262af78de3adf7` | Lanterna verde estatua cinza com punho de energia | — | Lanterna Verde · DC | Retido: a pose e o construto não confirmam personagem individual. |
| `mdl_4d7851b00a21937c9e0f` | Lanterna verde estatua com energia verde | — | Lanterna Verde · DC | Retido: o título e a imagem só confirmam o manto Lanterna Verde, não um portador específico. |
| `mdl_492778f14427f5b13e48` | Lanterna verde hal jordan com energia verde | Hal Jordan | Lanterna Verde · DC | Título público nomeia Hal Jordan; [perfil oficial DC](https://www.dc.com/characters/green-lantern); associação explícita em 0042. |
| `mdl_3def0d3c7e3f818caf21` | Estelar | Estelar | Titãs · DC | Título da API nomeia a personagem; [perfil oficial DC](https://www.dc.com/characters/starfire); relação explícita em 0043. |
| `mdl_721774c0f21326ebe495` | Estelar | Estelar | Titãs · DC | Segundo modelo de Estelar; título, pasta e perfil oficial DC confirmam identidade. |
| `mdl_0033cf3a5cb64ab103fd` | Ravena | Ravena | Titãs · DC | Título da API nomeia a personagem; [perfil oficial DC](https://www.dc.com/characters/raven); relação explícita em 0043. |
| `mdl_bd818f3fb3fef507610e` | Ravena | Ravena | Titãs · DC | Segundo modelo de Ravena; título, pasta e perfil oficial DC confirmam identidade. |
| `mdl_96135f53934330514880` | Adao negro e doutor destino | Adão Negro · Doutor Destino | Adão Negro · DC · Marvel | API confirma confronto e os dois nomes; associações separadas em `0031`; Doutor Destino mapeado para Doctor Doom/Marvel por instrução explícita do proprietário. |
| `mdl_6f2055604a9114497064` | Adao negro estatua cinza sobre destrocos | Adão Negro | Adão Negro · DC | Título público identifica o personagem; nome da tag é apenas Adão Negro, sem materialização/cenário. Associação em `0031`. |
| `mdl_bb6b835dce88fd473036` | Adao negro traje preto e dourado em pe | Adão Negro | Adão Negro · DC | Título público identifica o personagem; traje preto/dourado é variação visual, não parte da tag. Associação em `0031`. |
| `mdl_66bbea10d4ca6720dcf4` | Lobo armado sobre motocicleta em diorama | Lobo | Lobo · DC | Título da API identifica Lobo; [perfil oficial DC](https://www.dc.com/characters/lobo); moto e diorama não criam tags adicionais. Relação em 0044. |
| `mdl_6987735a5f77627d331c` | Lobo com arma gancho e buldogue | Lobo | Lobo · DC | Título da API identifica Lobo; arma e buldogue não são integrantes nomeados pelo título; perfil oficial DC confirma. |
| `mdl_7979f46c6c76dbb744d1` | Lobo estatua cinza sobre corpo | Lobo | Lobo · DC | Título da API identifica Lobo; acabamento cinza não altera a identidade canônica. |
| `mdl_7607c1117961570356c5` | Supergirl batalha sobre destrocos dupla vista | Supergirl | Supergirl · DC | Título da API identifica Supergirl; [perfil oficial DC](https://www.dc.com/characters/supergirl); duas vistas e destroços não alteram identidade. |
| `mdl_ff462d60a77175d98aa2` | Supergirl classica em pe sobre destrocos | Supergirl | Supergirl · DC | Título da API identifica Supergirl; traje clássico e cenário são variações do modelo. |
| `mdl_c600085918d7cb602210` | Supergirl classica multiplas vistas | Supergirl | Supergirl · DC | Título da API identifica Supergirl; múltiplas vistas continuam uma única relação. |
| `mdl_b87c4181813502e358e3` | Darkseid classico sobre base fortaleza | Darkseid | Darkseid · DC | Título da API identifica Darkseid; [perfil oficial DC](https://www.dc.com/characters/darkseid); base é contexto do modelo. |
| `mdl_cfde54ee5ef0d4abe616` | Darkseid traje branco e dourado em diorama | Darkseid | Darkseid · DC | Título da API identifica Darkseid; cor e traje não alteram a tag nominal. |
| `mdl_aaadde19f8c15850a82e` | Arqueiro verde dupla vista em pedestal | Arqueiro Verde | Arqueiro Verde · DC | Título da API identifica Arqueiro Verde; [perfil oficial DC](https://www.dc.com/characters/green-arrow); vistas duplas são uma relação. |
| `mdl_2237e89e7a0752b47a53` | Arqueiro verde estatua cinza disparando flecha | Arqueiro Verde | Arqueiro Verde · DC | Título da API identifica Arqueiro Verde; arco/flecha são props. |
| `mdl_066edffce81f8844ce34` | Zatanna com cartola e energia magica | Zatanna | Zatanna · DC | Título da API identifica Zatanna; fonte editorial [DC](https://www.dc.com/blog/2024/11/12/zatanna-d-cs-mistress-of-magic-is-back); cartola e magia não entram no nome da tag. |
| `mdl_d62ca10dec0c15f5508b` | Zatanna sentada com cartola coelho e cranio | Zatanna | Zatanna · DC | Título da API identifica Zatanna; coelho, cartola e crânio são elementos do modelo. |
| `mdl_a95afa4c87b16a6d2558` | Exterminador colorido sobre criatura e cranios | Exterminador | Exterminador · DC | Título da API identifica Exterminador; [perfil oficial DC](https://www.dc.com/characters/deathstroke) confirma Deathstroke/Slade Wilson; criatura e cenário não viram tags. |
| `mdl_1ac6f9f83f480f7d91f8` | Exterminador estatua cinza com rifle e cabecas alternativas | Exterminador | Exterminador · DC | Título da API identifica Exterminador; perfil oficial confirma identidade; rifle e cabeças alternativas são detalhes da ficha. |
| `mdl_6dcec9f6e77013ebeffc` | Shazam diorama com Billy Batson e figura mágica | Shazam | Shazam · DC | O título nomeia Shazam e Billy Batson, que DC identifica como a mesma identidade; figura mágica não nomeada fica sem tag. [Perfil oficial DC](https://www.dc.com/characters/shazam). |
| `mdl_2796214bc4da505aa613` | Shazam e Billy Batson diorama com chamas | Shazam | Shazam · DC | Shazam e Billy Batson são um personagem e recebem uma associação, sem tag duplicada de alter ego. [Perfil oficial DC](https://www.dc.com/characters/shazam). |
| `mdl_9f5e752ea99121dc578d` | Shazam e Freddy Freeman diorama cinza | Shazam · Freddy Freeman | Shazam · DC | O título nomeia duas identidades; Freddy fica separado de Shazam. [DC: Shazam](https://www.dc.com/characters/shazam) e [Família Shazam](https://www.dc.com/characters/shazam-family). |
| `mdl_1ea4c594b90bc53fb2eb` | Shazam estátua cinza três vistas em ação | Shazam | Shazam · DC | O título identifica Shazam; as três vistas representam um único modelo. [Perfil oficial DC](https://www.dc.com/characters/shazam). |
| `mdl_3ec2dd9221c4382caca6` | Shazam estátua cinza três vistas segurando lanche | Shazam | Shazam · DC | O título identifica Shazam; vistas e lanche são detalhes do modelo. [Perfil oficial DC](https://www.dc.com/characters/shazam). |
| `mdl_86425f2eeca770f7ae0d` | Flash busto estátua cinza | Flash | Flash · DC | O título confirma o manto Flash, mas não identifica Barry Allen, Jay Garrick ou Wally West; nenhum portador específico foi inferido. [Perfil oficial DC](https://www.dc.com/characters/the-flash). |
| `mdl_f29c8bd63e0a7fa06715` | Flash colorido sobre base com raios | Flash | Flash · DC | O título confirma Flash, sem evidência para um portador específico; raios e base não são tags. [Perfil oficial DC](https://www.dc.com/characters/the-flash). |
| `mdl_21d446f336a06ad1bddb` | Flash vs Flash Reverso | Flash · Flash Reverso | Flash · DC | Confronto registra os dois personagens separadamente. [Flash](https://www.dc.com/characters/the-flash) e [Flash Reverso](https://www.dc.com/characters/reverse-flash), perfis oficiais DC. |
| `mdl_7d67f172b46e60111987` | Flash vs Tubarão Rei | Flash · Tubarão Rei | Flash · DC | Confronto registra cada personagem separadamente. [Flash](https://www.dc.com/characters/the-flash) e [Tubarão Rei](https://www.dc.com/characters/king-shark), perfis oficiais DC. |
| `mdl_4c62133f60ff9ad97a80` | Homem-Gavião close colorido com lança e asas | Homem-Gavião | Homem-Gavião · DC | O título identifica Homem-Gavião; nenhuma identidade específica entre suas encarnações foi inferida. [Perfil oficial DC](https://www.dc.com/characters/hawkman). |
| `mdl_b11403664ba57639e061` | Homem-Gavião colorido com maça e asas | Homem-Gavião | Homem-Gavião · DC | O título identifica Homem-Gavião; maça e asas são características do modelo. [Perfil oficial DC](https://www.dc.com/characters/hawkman). |
| `mdl_1b71a890ad9bab053b01` | Homem-Gavião com lança e maça sobre pedestal | Homem-Gavião | Homem-Gavião · DC | O título identifica Homem-Gavião; armas e pedestal não viram tags adicionais. [Perfil oficial DC](https://www.dc.com/characters/hawkman). |
| `mdl_3830d2329b8276ce6540` | Homem-Gavião estátua cinza três vistas com machado | Homem-Gavião | Homem-Gavião · DC | O título identifica Homem-Gavião; três vistas do mesmo modelo e machado não alteram a identidade. [Perfil oficial DC](https://www.dc.com/characters/hawkman). |
| `mdl_5c2e89d7f975e797994e` | Mulher-Gavião em voo com maça | Mulher-Gavião | Mulher-Gavião · DC | O título identifica Mulher-Gavião; personagem individual separado de Homem-Gavião. [Perfil oficial DC](https://www.dc.com/characters/hawkgirl). |
| `mdl_311d57cb311dee4dbbac` | Caçador de Marte em voo sobre energia verde | Caçador de Marte | Caçador de Marte · DC | O título identifica a personagem; voo e energia não são tags. [Perfil oficial DC](https://www.dc.com/characters/martian-manhunter). |
| `mdl_ad36bb14ef40240a4bb8` | Constantine em diorama com magia e tentáculos | Constantine | Constantine · DC | O título identifica Constantine; magia e tentáculos são detalhes visuais. [Perfil oficial DC](https://www.dc.com/characters/john-constantine). |
| `mdl_c37d85eb002096310fd1` | Pacificador com armas e águia sobre destroços | Pacificador | Pacificador · DC | O título identifica Pacificador; águia, armas e destroços não são personagens adicionais. [Perfil oficial DC](https://www.dc.com/characters/peacemaker). |
| `mdl_1892bc682cd0eb73d858` | Solomon Grundy sobre túmulo em diorama | Solomon Grundy | Solomon Grundy · DC | O título identifica Solomon Grundy; túmulo é cenário. [Perfil oficial DC](https://www.dc.com/characters/solomon-grundy). |
| `mdl_a830e65b50c076e1f3e0` | Senhor Destino em voo sobre estátua egípcia | Senhor Destino | Senhor Destino · DC | O título identifica Doctor Fate; voo e estátua são detalhes do modelo. [Perfil oficial DC](https://www.dc.com/characters/doctor-fate). |
| `mdl_ed80ee4573626a8e12c4` | Super Choque sobre prancha com eletricidade | Super Choque | Super Choque · DC | O título identifica Super Choque, nome localizado de Static; prancha e eletricidade são detalhes. [Perfil oficial DC](https://www.dc.com/characters/static). |
| `mdl_539110cb1c68f21db454` | Red Sonja | Red Sonja | Red Sonja · Dynamite | Título, pasta e catálogo oficial da editora identificam a personagem. [Dynamite](https://dynamite.com/titles/red-sonja/). |
| `mdl_830e54c0bb81b3fca4e0` | Red Sonja | Red Sonja | Red Sonja · Dynamite | Segundo modelo da mesma personagem; ID revisado separadamente. [Dynamite](https://dynamite.com/titles/red-sonja/). |
| `mdl_a8bc7dfc982503c46967` | Demolidor x Rei do Crime | Demolidor · Rei do Crime | Dioramas & Confrontos · Marvel | Título separa Matt Murdock/Demolidor e Wilson Fisk/Rei do Crime em duas tags individuais. Fontes oficiais Marvel: [Demolidor](https://www.marvel.com/characters/daredevil-matthew-murdock/on-screen) e [Kingpin](https://www.marvel.com/characters/kingpin/). |
| `mdl_4a30f60ad77e6641899a` | Justiceiro e Wolverine | Justiceiro · Wolverine | Dioramas & Confrontos · Marvel | Título nomeia dois personagens e recebe duas associações. Fontes oficiais: [Justiceiro](https://www.marvel.com/characters/punisher-frank-castle) e [Wolverine/X-Men](https://www.marvel.com/teams-and-groups/x-men/in-comics). |
| `mdl_794b70f6834ae9155462` | Pantera Negra e Namor | Pantera Negra · Namor | Dioramas & Confrontos · Marvel | Título nomeia os dois personagens separadamente. Fontes oficiais: [Pantera Negra/Vingadores](https://www.marvel.com/teams-and-groups/avengers/in-comics) e [Namor](https://www.marvel.com/characters/sub-mariner). |
| `mdl_60d6adc77461a015ebef` | Pantera Negra x Killmonger | Pantera Negra · Killmonger | Dioramas & Confrontos · Marvel | Confronto tem duas relações, uma por personagem. [Marvel: Vingadores](https://www.marvel.com/teams-and-groups/avengers/in-comics) e [Killmonger](https://share.marvel.com/comics/discover/904/killmonger). |
| `mdl_bcf35d4718ee9bb71db7` | Thanos e Sentry | Thanos · Sentry | Dioramas & Confrontos · Marvel | Título nomeia dois personagens individuais; nenhum membro da equipe foi inferido. Fontes oficiais: [Thanos](https://www.marvel.com/characters/Thanos) e [Sentry](https://share.marvel.com/comics/discover/2463/sentry). |
| `mdl_77d457b17eb24a690e1d` | Loki | Loki | Loki e Sylvie · Marvel | Título e coleção pública confirmam Loki; primeiro ID individual. [Perfil oficial Marvel](https://www.marvel.com/characters/loki/). |
| `mdl_c65c1e0abec4f37f1f31` | Loki | Loki | Loki e Sylvie · Marvel | Título e coleção pública confirmam Loki; segundo ID individual. [Perfil oficial Marvel](https://www.marvel.com/characters/loki/). |
| `mdl_fe78a0784dd5090ea683` | Loki | Loki | Loki e Sylvie · Marvel | Título e coleção pública confirmam Loki; terceiro ID individual. [Perfil oficial Marvel](https://www.marvel.com/characters/loki/). |
| `mdl_cfe37def386b9d7c7e92` | Sylvie | Sylvie | Loki e Sylvie · Marvel | Título e coleção pública confirmam Sylvie; associação separada de Loki, sem inferir sobrenome ou versão. [Marvel](https://www.marvel.com/articles/tv-shows/loki-sylvie-in-love) a descreve como variante com identidade própria. |
## Retido para evidência adicional

| ID do modelo | Título público | Estado | Evidência necessária |
|---|---|---|---|
| `mdl_214be678a7bd0cfbf6b2` | Batmóvel | Sem associação de personagem por enquanto; o título identifica um veículo, e apenas o slug menciona Batman. | Conferir visualmente a peça para confirmar se Batman aparece antes de associar personagem. A franquia Batman já consta no registro público. |
| `mdl_d1fb92ff5d196c8e09c5` | Manopla do infinito | Retido; a API a classifica na coleção de equipamentos e ela não é personagem. | A taxonomia atual só modela atributos de personagem; aguardar suporte para objetos/equipamentos antes de criar uma tag própria. |
| `mdl_eadcfd321b548fa0a49c` | Aranhaverso diorama grupo de personagens | Retido; o título não identifica os integrantes individuais. | Revisar as imagens do post e cadastrar cada personagem separado antes de associar chips. |
| `mdl_081697edc0f36f131d74` | Hulkbuster | Retido como armadura/equipamento, não personagem. | Criar taxonomia própria de equipamentos antes de atribuir tag ao item. |
| `mdl_9409f6debd14b828bb10` | Hulkbuster | Retido como armadura/equipamento, não personagem. | Mesmo conjunto Hulkbuster; sem vincular Iron Man pela peça isolada. |
| `mdl_9455c9aa910f0ddcf546` | Hulkbuster | Retido como armadura/equipamento, não personagem. | Mesmo conjunto Hulkbuster; sem vínculo de personagem por inferência. |
| `mdl_16919b02c3d3edb9fb8f` | Manopola do homem de ferro | Retido como equipamento. | Criar taxonomia de objetos/equipamentos antes de associar qualquer personagem. |
| `mdl_04856a7efd88ac7d7075` | Quarteto fantastico grupo diorama | Retido; grupo sem integrantes identificados pelo título. | Conferir imagens e registrar cada membro individualmente; não criar um chip composto. |
| `mdl_7d6c24918db1b2dc2c14` | Sentinela | Retido; classe genérica de robô mutante, sem um personagem individual identificável. | Confirmar visualmente se a peça apresenta uma unidade/nome próprio antes de criar uma entidade canônica. |
| `mdl_3b60bfc805fcbf3510d0` | Liga da Justiça diorama | Retido; o título nomeia uma equipe, mas não identifica os integrantes da escultura. | Revisar imagens e registrar os integrantes individualmente; manter somente a franquia/equipe enquanto não houver nomes confirmados. |
| `mdl_2cc249ac4a85c3fa044b` | Vingadores | Retido; o título nomeia uma equipe, não seus integrantes individuais. | Revisar imagens antes de adicionar personagens; manter somente a tag de equipe/franquia até identificar os membros. |

## Próximo registro

Batman no contrato e na API pública: **77 modelos publicados**, 76 com vínculo de personagem e `mdl_214be678a7bd0cfbf6b2` retido para evidência visual. Superman: **26/26 IDs** reconciliados. “Vilões” tem 24 publicados: 23 com personagem e a Manopla retida como equipamento. Heróis Individuais tem 143 publicados: 142 com personagem e o diorama Aranhaverso retido. Mulher-Maravilha: 21/21. Equipes e Grupos: **354/354 modelos em 8 páginas**, associações de confronto individuais. Aquaman: **9/9**; Lanterna Verde: **7/7**, com quatro identidades retidas; Titãs: **4/4**; Adão Negro: **3/3**; Lobo: **3/3**. Supergirl: **3/3**; Darkseid, Arqueiro Verde, Zatanna e Exterminador: **2/2 cada**, relações explícitas em 0045. Shazam: **5/5**; Flash: **4/4**, confrontos separados em 0046. Homem-Gavião e Mulher-Gavião: **5/5** em 0047. Caçador de Marte, Constantine, Pacificador, Solomon Grundy, Senhor Destino e Super Choque: **6/6** em 0048; Liga da Justiça: **1 retido** sem integrantes nomeados. Red Sonja: **2/2**; Dioramas & Confrontos: **5/6** com personagens ligados e Vingadores **1 retido** por falta de integrantes nomeados, revisados em 0049. Loki e Sylvie: **4/4**, com três IDs Loki e um ID Sylvie separados em 0050.

## Integridade das migrations locais

A migration `0032_seed_marvel_individual_catalog_tags.sql` foi substituída por um placeholder SQL sem escrita: o arquivo anterior tinha 78.595 bytes NUL e nenhum conteúdo recuperável neste checkout. Portanto, ele não associa modelos Marvel. A categoria Heróis Individuais e qualquer vínculo histórico atribuído a `0032` precisam ser conferidos novamente por ID antes de gerar novos seeds explícitos. Os seeds `0034`–`0052` guardam relações individualizadas já auditadas em SQL idempotente; são candidatos locais e não foram aplicados. `0051` restaura cinco relações ausentes de Adam Warlock a Aranha Escarlate; Abutre permanece apenas em `0031`. `0052` recupera os outros 41 modelos nomeados da primeira página por associação explícita; o diorama Aranhaverso continua retido por não nomear membros.

## Lotes que aguardam auditoria individual

- A migration 0032 é intencionalmente sem escrita até reconstruir a revisão de Heróis Individuais/Marvel; a 0033 mantém associações em lote comentadas como pendentes. Novos vínculos serão adicionados como linhas explícitas por ID à medida que cada modelo for revisado.
- As associações de 0031 que não vieram diretamente de uma instrução específica também entram na fila de revisão por modelo. Nenhuma das migrations 0028–0033 foi aplicada ao D1 nesta tarefa.
- Alterações de apresentação compartilhadas — alias “O Máscara”, ordem dos chips e medição do espaço disponível — não constituem fonte de identidade e não substituem a curadoria do D1.

## Critério de conclusão

Todos os IDs publicados dos inventários original e Telegram foram revisados uma vez; cada personagem nomeado tem relação individual; editora, franquia, universo e atributos pertinentes têm vínculo único; ambiguidades estão anotadas; ambas as rotas leem a mesma projeção do Worker/D1. O release permanece separado dessa auditoria e depende do gate de publicação autorizado.
