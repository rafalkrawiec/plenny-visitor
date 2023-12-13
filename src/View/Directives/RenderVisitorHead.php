<?php

namespace Plenny\Visitor\View\Directives;


class RenderVisitorHead
{
    public static function compile(): string
    {
        $template = '
            <?php foreach($data[\'props\'][\'meta\'] ?? [] as $meta): ?>
                <?php if($meta[\'type\'] === \'title\'): ?>
                    <title data-visitor><?php echo $meta[\'content\'] ?></title>
                <?php endif; ?>
                
                <?php if($meta[\'type\'] === \'meta\'): ?>
                    <meta data-visitor name="<?php echo $meta[\'name\'] ?>" content="<?php echo $meta[\'content\'] ?>"/>
                <?php endif; ?>
                
                <?php if($meta[\'type\'] === \'snippet\'): ?>
                    <script data-visitor type="application/ld+json">
                      <?php echo $meta[\'content\'] ?>
                    </script>
                <?php endif; ?>
            <?php endforeach; ?>
        ';

        return implode('', array_map('trim', explode("\n", $template)));
    }
}
