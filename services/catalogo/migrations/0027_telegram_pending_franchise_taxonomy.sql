-- Explicit and truthful classification for named Telegram previews whose
-- franchise was not identified. Never assign a false known franchise.
-- Both rows are canonical D1 taxonomy; model_count remains zero while
-- Telegram previews are published=0 (not for sale).
INSERT INTO categories(slug,name,sort_order,model_count)
VALUES ('curadoria-pendente','Curadoria pendente',900,0);

INSERT INTO franchises(category_id,slug,name,model_count)
SELECT id,'franquia-a-identificar','Franquia a identificar',0
FROM categories WHERE slug='curadoria-pendente';
