import type { Schema, Struct } from '@strapi/strapi';

export interface PageSection extends Struct.ComponentSchema {
  collectionName: 'components_page_sections';
  info: {
    description: '\uD68C\uC0AC \uC18C\uAC1C \uD398\uC774\uC9C0\uC758 \uAC1C\uBCC4 \uC139\uC158 (\uC774\uBBF8\uC9C0/\uC601\uC0C1/\uD14D\uC2A4\uD2B8)';
    displayName: 'Section';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['left', 'right', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    body: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    video: Schema.Attribute.Media<'videos'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'page.section': PageSection;
    }
  }
}
