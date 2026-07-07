export default function (eleventyConfig) {
  // Copied to the output as-is (not processed as templates)
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("outreach");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.txt");

  // The BB84 demo pages are self-contained; never run them through Nunjucks
  eleventyConfig.ignores.add("outreach/**");

  return {
    // Restricting templateFormats keeps .md/.txt/.sql/.py files untouched
    templateFormats: ["html", "njk"],
    htmlTemplateEngine: "njk",
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
