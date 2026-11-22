// Catalogo da demonstracao da edicao comercial: nomes, codigos e mix proprios do SBI, sem marca de terceiros.
//
// Por que existe: o recorte Olist que alimenta a demonstracao academica tem licenca nao comercial
// (CC BY-NC-SA 4.0), entao a oferta comercial nao pode apresentar aquele catalogo. Aqui a loja e uma loja
// modelo de eletronicos, com produtos inventados.
//
// Mesma forma e mesmas categorias do catalogo academico, e a faixa de preco por posicao e a mesma: o simulador,
// as metas e o mes de referencia do roteiro continuam reconciliando sem recalcular o cenario. Uma tabela de
// precos propria, desenhada para a oferta comercial, esta registrada como pendencia no aceite comercial.
import type { DemoProduct } from './catalog.ts';

export const COMERCIAL_PRODUCTS: readonly DemoProduct[] = [
  ["SB-ADP-USBC-P2", "Adaptador USB-C para P2 Nortis", "Acessorios", 8900, 4005],
  ["SB-PEL-N7", "Película de vidro Nortis para Smartphone N7", "Acessorios", 35900, 11129],
  ["SB-CABO-USBC-1M", "Cabo USB-C de 60 W Nortis (1 m)", "Acessorios", 19700, 6304],
  ["SB-CABO-MICRO-1M", "Cabo USB-C para micro-USB Nortis (1 m)", "Acessorios", 19700, 8471],
  ["SB-TAG-1", "Localizador Bluetooth Nortis Tag", "Acessorios", 33200, 12948],
  ["SB-PUL-ESP-46", "Pulseira esportiva Nortis de 46 mm", "Acessorios", 49400, 17784],
  ["SB-CAPA-TRP-N7", "Capa transparente Nortis para Smartphone N7", "Acessorios", 47600, 19992],
  ["SB-PUL-LOOP-42", "Pulseira de tecido Nortis de 42 mm", "Acessorios", 49400, 18772],
  ["SB-CAPA-SIL-N9P", "Capa de silicone Nortis para Smartphone N9 Pro", "Acessorios", 47600, 19516],
  ["SB-CARR-MAG-1M", "Carregador magnético Nortis (1 m)", "Acessorios", 43100, 14223],
  ["SB-FONTE-35W", "Fonte USB-C dupla Nortis de 35 W", "Acessorios", 50300, 16096],
  ["SB-FOLIO-TAB11", "Capa com teclado Nortis para Tablet T11", "Acessorios", 80900, 26697],
  ["SB-MOUSE-USBC", "Mouse sem fio Nortis Glide", "Acessorios", 74600, 26856],
  ["SB-CANETA-USBC", "Caneta digital Nortis Stylus", "Acessorios", 80900, 25079],
  ["SB-TAG-4", "Localizador Bluetooth Nortis Tag (4 unidades)", "Acessorios", 119900, 40766],
  ["SB-FONE-A5", "Fone de ouvido sem fio Nortis Aura 5", "Audio", 149900, 98934],
  ["SB-SOM-MINI", "Caixa de som inteligente Nortis Mini", "Casa inteligente", 99900, 65934],
  ["SB-CANETA-PRO", "Caneta digital Nortis Stylus Pro", "Acessorios", 134900, 51262],
  ["SB-TECLADO-BIO", "Teclado sem fio Nortis com leitor biométrico", "Acessorios", 152900, 47399],
  ["SB-FONE-A5-SF", "Fone de ouvido sem fio Nortis Aura 5 com base de recarga", "Audio", 152900, 94798],
  ["SB-TVBOX-4K", "Receptor de TV Nortis 4K", "Casa inteligente", 323900, 229969],
  ["SB-FONE-APRO3", "Fone de ouvido Nortis Aura Pro 3 com cancelamento de ruído", "Audio", 199900, 127936],
  ["SB-REL-M40", "Relógio inteligente Nortis Move 40 mm", "Wearables", 249900, 169932],
  ["SB-TAB-T11-128", "Tablet Nortis T11 de 128 GB", "Tablets", 389900, 249536],
  ["SB-REL-S12-42", "Relógio inteligente Nortis Move S12 de 42 mm", "Wearables", 494900, 326634],
  ["SB-N7E-256", "Smartphone Nortis N7e de 256 GB", "Smartphones", 479900, 307136],
  ["SB-FONE-MAX2", "Fone de ouvido Nortis Aura Max 2", "Audio", 569900, 398930],
  ["SB-TAB-MINI-128", "Tablet Nortis T Mini de 128 GB", "Tablets", 719900, 518328],
  ["SB-REL-S12-46-CEL", "Relógio inteligente Nortis Move S12 de 46 mm com celular", "Wearables", 665900, 472789],
  ["SB-N6-128", "Smartphone Nortis N6 de 128 GB", "Smartphones", 495900, 357048],
  ["SB-TAB-AIR-11", "Tablet Nortis T Air de 11 pol.", "Tablets", 749900, 487435],
  ["SB-CUBE-16", "Mini computador Nortis Cube de 16 GB", "Computadores", 971900, 622016],
  ["SB-N7-256", "Smartphone Nortis N7 de 256 GB", "Smartphones", 569900, 381833],
  ["SB-REL-ULTRA4", "Relógio inteligente Nortis Move Ultra 4", "Wearables", 944900, 661430],
  ["SB-NAIR-256", "Smartphone Nortis N Air de 256 GB", "Smartphones", 729900, 467136],
  ["SB-BOOK-13", "Notebook Nortis Book de 13 pol. e 16 GB", "Computadores", 1199900, 815932],
  ["SB-N9P-256", "Smartphone Nortis N9 Pro de 256 GB", "Smartphones", 1079900, 755930],
  ["SB-TAB-PRO-11", "Tablet Nortis T Pro de 11 pol. e 256 GB", "Tablets", 1529900, 1070930],
  ["SB-N9PM-256", "Smartphone Nortis N9 Pro Max de 256 GB", "Smartphones", 1169900, 854027],
  ["SB-VIEW-24", "Computador todo-em-um Nortis View de 24 pol.", "Computadores", 1619900, 1085333],
  ["SB-BOOK-15", "Notebook Nortis Book de 15 pol. e 16 GB", "Computadores", 1646900, 1136361],
  ["SB-BOOK-PRO-14", "Notebook Nortis Book Pro de 14 pol. e 1 TB", "Computadores", 2159900, 1555128],
];
